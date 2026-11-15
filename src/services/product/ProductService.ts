import { authorizationService } from '../auth/AuthorizationService';
import {
  productRepository,
  stockMovementRepository,
  productPriceTierRepository,
  withTransaction,
} from '@/database';
import { ProductEntity, MovementType, ProductPriceTierEntity } from '@/database/types';

export interface CreateProductPriceTierInput {
  minQuantity: number;
  unitPrice: number;
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockTracking: boolean;
  initialStock: number;
  minimumStock: number;
  unit: string;
  imageUri?: string | null;
  isActive?: boolean;
  priceTiers?: CreateProductPriceTierInput[];
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string | null;
  purchasePrice?: number;
  sellingPrice?: number;
  stockTracking?: boolean;
  minimumStock?: number;
  unit?: string;
  imageUri?: string | null;
  isActive?: boolean;
  priceTiers?: CreateProductPriceTierInput[];
}

/**
 * Validates product wholesale price tiers.
 *
 * Rules:
 * - minQuantity: must be a strictly positive finite number (> 0).
 * - unitPrice: must be a non-negative integer (>= 0, without decimal Rupiah).
 * - No duplicate minQuantity thresholds.
 * - Each tier unit price cannot be higher than base selling price (if base price provided).
 * - Conflicting rules: Tiers with higher minQuantity cannot have a higher unitPrice than lower tiers.
 */
export function validateProductPriceTiers(
  tiers: CreateProductPriceTierInput[] | undefined,
  baseSellingPrice?: number
): void {
  if (!tiers || tiers.length === 0) {
    return;
  }

  const seenQuantities = new Set<number>();

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const indexStr = `Tingkat ${i + 1}`;

    // 1. Minimum quantity validation
    if (typeof tier.minQuantity !== 'number' || !Number.isFinite(tier.minQuantity) || isNaN(tier.minQuantity)) {
      throw new Error(`${indexStr}: Jumlah minimal pembelian harus berupa angka yang valid`);
    }
    if (tier.minQuantity <= 0) {
      throw new Error(`${indexStr}: Jumlah minimal pembelian harus lebih besar dari 0`);
    }

    // 2. Unit price validation (non-negative integer Rupiah)
    if (typeof tier.unitPrice !== 'number' || !Number.isFinite(tier.unitPrice) || isNaN(tier.unitPrice)) {
      throw new Error(`${indexStr}: Harga grosir per satuan harus berupa angka yang valid`);
    }
    if (!Number.isInteger(tier.unitPrice)) {
      throw new Error(`${indexStr}: Harga grosir per satuan harus berupa bilangan bulat Rupiah (tanpa desimal)`);
    }
    if (tier.unitPrice < 0) {
      throw new Error(`${indexStr}: Harga grosir per satuan tidak boleh negatif`);
    }

    // 3. Duplicate threshold check
    if (seenQuantities.has(tier.minQuantity)) {
      throw new Error(`Jumlah minimal pembelian ${tier.minQuantity} tidak boleh duplikat`);
    }
    seenQuantities.add(tier.minQuantity);

    // 4. Base selling price conflict check
    if (baseSellingPrice !== undefined && tier.unitPrice > baseSellingPrice) {
      throw new Error(
        `${indexStr}: Harga grosir (${tier.unitPrice}) tidak boleh lebih mahal dari harga jual normal (${baseSellingPrice})`
      );
    }
  }

  // 5. Conflicting rules check between tiers:
  // When sorted ascending by minQuantity, each successive tier must have unitPrice <= previous tier
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (next.unitPrice > current.unitPrice) {
      throw new Error(
        `Aturan harga grosir konflik: Pembelian minimal ${next.minQuantity} (${next.unitPrice}) lebih mahal dari pembelian minimal ${current.minQuantity} (${current.unitPrice})`
      );
    }
  }
}

export interface AdjustStockInput {
  productId: string;
  movementType: MovementType;
  quantityDelta: number; // positive to add stock, negative to deduct stock
  notes?: string;
}

export class ProductService {
  async getProducts(includeInactive: boolean = false): Promise<ProductEntity[]> {
    return productRepository.getAll(includeInactive);
  }

  async searchProducts(
    query: string,
    categoryId?: string | null,
    includeInactive: boolean = false
  ): Promise<ProductEntity[]> {
    return productRepository.search(query, categoryId, includeInactive);
  }

  async getProductById(id: string): Promise<ProductEntity | null> {
    return productRepository.getById(id);
  }

  async getPriceTiers(productId: string): Promise<ProductPriceTierEntity[]> {
    return productPriceTierRepository.getByProductId(productId);
  }

  async createProduct(input: CreateProductInput): Promise<ProductEntity> {
    authorizationService.requirePermission('product.create');
    // 1. Validation
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Nama produk tidak boleh kosong');
    }
    if (input.sellingPrice < 0) {
      throw new Error('Harga jual tidak boleh negatif');
    }
    if (input.purchasePrice < 0) {
      throw new Error('Harga beli tidak boleh negatif');
    }
    if (input.minimumStock < 0) {
      throw new Error('Stok minimum tidak boleh negatif');
    }
    if (input.initialStock < 0) {
      throw new Error('Stok awal tidak boleh negatif');
    }

    // Validate wholesale price tiers against sellingPrice
    if (input.priceTiers && input.priceTiers.length > 0) {
      validateProductPriceTiers(input.priceTiers, input.sellingPrice);
    }

    const sku = input.sku && input.sku.trim().length > 0 ? input.sku.trim() : `SKU-${Date.now()}`;
    const barcode = input.barcode && input.barcode.trim().length > 0 ? input.barcode.trim() : null;

    // Check SKU uniqueness
    const existingSku = await productRepository.getBySKU(sku);
    if (existingSku) {
      throw new Error(`SKU "${sku}" sudah digunakan oleh produk "${existingSku.name}"`);
    }

    // Check Barcode uniqueness
    if (barcode) {
      const existingBarcode = await productRepository.getByBarcode(barcode);
      if (existingBarcode) {
        throw new Error(`Barcode "${barcode}" sudah digunakan oleh produk "${existingBarcode.name}"`);
      }
    }

    const productId = `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 2. Atomic Database Operation (Product Creation + Initial Stock Movement + Price Tiers)
    return withTransaction(async (db) => {
      const createdProduct = await productRepository.create({
        id: productId,
        category_id: input.categoryId || null,
        sku,
        barcode,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        purchase_price: input.purchasePrice,
        selling_price: input.sellingPrice,
        stock_tracking: input.stockTracking ? 1 : 0,
        current_stock: input.initialStock,
        minimum_stock: input.minimumStock,
        unit: input.unit?.trim() || 'pcs',
        image_uri: input.imageUri || null,
        is_active: input.isActive ?? true ? 1 : 0,
      });

      if (input.stockTracking && input.initialStock > 0) {
        await stockMovementRepository.create({
          id: `sm_init_${productId}`,
          product_id: productId,
          movement_type: 'ADJUSTMENT',
          quantity: input.initialStock,
          reference_type: 'INITIAL_STOCK',
          reference_id: 'INIT',
          notes: 'Stok awal produk baru',
        });
      }

      if (input.priceTiers && input.priceTiers.length > 0) {
        await productPriceTierRepository.replaceForProduct(
          productId,
          input.priceTiers.map((t) => ({ min_quantity: t.minQuantity, unit_price: t.unitPrice })),
          db
        );
      }

      return createdProduct;
    });
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<void> {
    authorizationService.requirePermission('product.edit');
    const existing = await productRepository.getById(id);
    if (!existing) {
      throw new Error('Produk tidak ditemukan');
    }

    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new Error('Nama produk tidak boleh kosong');
    }
    if (input.sellingPrice !== undefined && input.sellingPrice < 0) {
      throw new Error('Harga jual tidak boleh negatif');
    }
    if (input.purchasePrice !== undefined && input.purchasePrice < 0) {
      throw new Error('Harga beli tidak boleh negatif');
    }
    if (input.minimumStock !== undefined && input.minimumStock < 0) {
      throw new Error('Stok minimum tidak boleh negatif');
    }

    const effectiveBasePrice = input.sellingPrice !== undefined ? input.sellingPrice : existing.selling_price;
    if (input.priceTiers !== undefined && input.priceTiers.length > 0) {
      validateProductPriceTiers(input.priceTiers, effectiveBasePrice);
    }

    // Check SKU uniqueness on change
    if (input.sku && input.sku.trim() !== existing.sku) {
      const existingSku = await productRepository.getBySKU(input.sku.trim());
      if (existingSku && existingSku.id !== id) {
        throw new Error(`SKU "${input.sku}" sudah digunakan oleh produk lain`);
      }
    }

    // Check Barcode uniqueness on change
    if (input.barcode !== undefined && input.barcode !== existing.barcode && input.barcode !== null && input.barcode.trim().length > 0) {
      const existingBarcode = await productRepository.getByBarcode(input.barcode.trim());
      if (existingBarcode && existingBarcode.id !== id) {
        throw new Error(`Barcode "${input.barcode}" sudah digunakan oleh produk lain`);
      }
    }

    const updates: Partial<Omit<ProductEntity, 'id' | 'created_at'>> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.sku !== undefined) updates.sku = input.sku.trim();
    if (input.barcode !== undefined) updates.barcode = input.barcode ? input.barcode.trim() : null;
    if (input.description !== undefined) updates.description = input.description ? input.description.trim() : null;
    if (input.categoryId !== undefined) updates.category_id = input.categoryId;
    if (input.purchasePrice !== undefined) updates.purchase_price = input.purchasePrice;
    if (input.sellingPrice !== undefined) updates.selling_price = input.sellingPrice;
    if (input.stockTracking !== undefined) updates.stock_tracking = input.stockTracking ? 1 : 0;
    if (input.minimumStock !== undefined) updates.minimum_stock = input.minimumStock;
    if (input.unit !== undefined) updates.unit = input.unit.trim();
    if (input.imageUri !== undefined) updates.image_uri = input.imageUri;
    if (input.isActive !== undefined) updates.is_active = input.isActive ? 1 : 0;

    return withTransaction(async (db) => {
      if (Object.keys(updates).length > 0) {
        await productRepository.update(id, updates);
      }

      if (input.priceTiers !== undefined) {
        await productPriceTierRepository.replaceForProduct(
          id,
          input.priceTiers.map((t) => ({ min_quantity: t.minQuantity, unit_price: t.unitPrice })),
          db
        );
      }
    });
  }

  async adjustStock(input: AdjustStockInput): Promise<void> {
    authorizationService.requirePermission('product.stock_adjust');
    const product = await productRepository.getById(input.productId);
    if (!product) {
      throw new Error('Produk tidak ditemukan');
    }
    if (input.quantityDelta === 0) {
      throw new Error('Jumlah penyesuaian stok tidak boleh 0');
    }

    const newStock = product.current_stock + input.quantityDelta;
    if (newStock < 0) {
      throw new Error(`Stok tidak mencukupi. Stok saat ini: ${product.current_stock}, penyesuaian: ${input.quantityDelta}`);
    }

    const movementId = `sm_adj_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return withTransaction(async () => {
      await stockMovementRepository.create({
        id: movementId,
        product_id: input.productId,
        movement_type: input.movementType,
        quantity: input.quantityDelta,
        reference_type: 'MANUAL_ADJUSTMENT',
        reference_id: null,
        notes: input.notes?.trim() || 'Penyesuaian stok manual',
      });

      await productRepository.updateStock(input.productId, input.quantityDelta);
    });
  }

  async setProductActiveStatus(id: string, isActive: boolean): Promise<void> {
    authorizationService.requirePermission('product.edit');
    const product = await productRepository.getById(id);
    if (!product) {
      throw new Error('Produk tidak ditemukan');
    }
    await productRepository.setActiveStatus(id, isActive);
  }
}

export const productService = new ProductService();
