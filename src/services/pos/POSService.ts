import { productService } from '@/services/product/ProductService';
import { productPriceTierRepository } from '@/database';
import { ProductEntity, CustomerEntity, ProductPriceTierEntity } from '@/database/types';
import {
  calculateLineSubtotal,
  resolveTierUnitPrice,
  formatQuantity,
  isDecimalAllowedForUnit,
} from '@/utils/quantity';

export interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  barcode?: string | null;
  baseUnitPrice?: number; // Base selling price (e.g. Rp 1.000)
  unitPrice: number; // Effective unit price (base or wholesale tier)
  tiers?: Array<{ min_quantity: number; unit_price: number }>; // Configured wholesale tiers
  activeTier?: { min_quantity: number; unit_price: number } | null; // Matching tier if active
  quantity: number;
  subtotal: number;
  availableStock: number;
  unit: string;
  stockTracking?: boolean;
}

export type DiscountType = 'FIXED' | 'PERCENT';

export interface DiscountState {
  type: DiscountType;
  value: number; // Amount or Percentage
  calculatedAmount: number; // Integer minor units
}

export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  totalItemCount: number;
}

export interface CheckoutPayload {
  items: CartItem[];
  customer: CustomerEntity | null;
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  createdAt: string;
}

export class POSService {
  /**
   * Load active products for POS cashier catalog from SQLite database,
   * including active wholesale price tiers.
   * Optimized in Phase 1: Uses a single batch query for tiers instead of N+1 queries.
   */
  async getCashierProducts(
    query?: string,
    categoryId?: string | null
  ): Promise<Array<ProductEntity & { priceTiers?: ProductPriceTierEntity[] }>> {
    const products = await productService.searchProducts(query || '', categoryId, false);
    if (products.length === 0) return [];

    let tierMap = new Map<string, ProductPriceTierEntity[]>();
    try {
      const productIds = products.map((p) => p.id);
      tierMap = await productPriceTierRepository.getAllGrouped(productIds);
    } catch (err) {
      console.warn('[POSService] Failed to batch load price tiers:', err);
    }

    // Attach price tiers per product in memory (O(N) mapping, 0 additional DB queries)
    return products.map((p) => ({
      ...p,
      priceTiers: tierMap.get(p.id) || [],
    }));
  }

  /**
   * Calculate totals (Subtotal, Discount, Grand Total) in integer minor units.
   */
  calculateTotals(items: CartItem[], discount: DiscountState): CartTotals {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    let calculatedDiscount = 0;
    if (discount.type === 'FIXED') {
      calculatedDiscount = Math.min(Math.max(0, Math.round(discount.value)), subtotal);
    } else if (discount.type === 'PERCENT') {
      const pct = Math.min(Math.max(0, discount.value), 100);
      calculatedDiscount = Math.min(Math.round((subtotal * pct) / 100), subtotal);
    }

    const grandTotal = Math.max(0, subtotal - calculatedDiscount);

    return {
      subtotal,
      discountAmount: calculatedDiscount,
      grandTotal,
      totalItemCount: Math.round(totalItemCount * 1000) / 1000,
    };
  }

  /**
   * Set item quantity directly in the cart with stock validation and wholesale tier resolution.
   */
  setItemQuantity(currentCart: CartItem[], productId: string, quantity: number): CartItem[] {
    const existingIndex = currentCart.findIndex((item) => item.productId === productId);
    if (existingIndex < 0) return currentCart;

    const existingItem = currentCart[existingIndex];

    if (!Number.isFinite(quantity) || isNaN(quantity) || quantity < 0) {
      throw new Error('Kuantitas tidak valid.');
    }

    if (quantity === 0) {
      // Remove item if quantity is set to 0
      return currentCart.filter((item) => item.productId !== productId);
    }

    const isDecimal = isDecimalAllowedForUnit(existingItem.unit);
    if (!isDecimal && !Number.isInteger(quantity)) {
      throw new Error(`Produk dengan satuan "${existingItem.unit}" hanya menerima jumlah bulat (tanpa desimal).`);
    }

    const isTracked = existingItem.stockTracking !== false;
    if (isTracked && quantity > existingItem.availableStock) {
      throw new Error(
        `Stok tidak mencukupi. Tersedia: ${formatQuantity(existingItem.availableStock)} ${existingItem.unit}`
      );
    }

    // Clamp quantity to maximum 3 decimal places
    const safeQty = Math.round(quantity * 1000) / 1000;
    const basePrice = existingItem.baseUnitPrice ?? existingItem.unitPrice;
    const { unitPrice, activeTier } = resolveTierUnitPrice(basePrice, existingItem.tiers, safeQty);
    const subtotal = calculateLineSubtotal(unitPrice, safeQty);

    const updatedCart = [...currentCart];
    updatedCart[existingIndex] = {
      ...existingItem,
      baseUnitPrice: basePrice,
      unitPrice,
      activeTier,
      quantity: safeQty,
      subtotal,
    };

    return updatedCart;
  }

  /**
   * Add a product to the cart with stock validation and wholesale tier resolution.
   * Returns updated cart items or throws error if stock is insufficient.
   */
  addItemToCart(
    currentCart: CartItem[],
    product: ProductEntity & { priceTiers?: Array<{ min_quantity: number; unit_price: number }> }
  ): CartItem[] {
    if (product.is_active === 0) {
      throw new Error(`Produk "${product.name}" sedang non-aktif.`);
    }

    const isTracked = product.stock_tracking === 1;

    if (isTracked && product.current_stock <= 0) {
      throw new Error(`Stok produk "${product.name}" habis.`);
    }

    const existingIndex = currentCart.findIndex((item) => item.productId === product.id);

    if (existingIndex >= 0) {
      const existingItem = currentCart[existingIndex];
      const newQty = existingItem.quantity + 1;
      return this.setItemQuantity(currentCart, product.id, newQty);
    } else {
      const initialQty = 1;
      const basePrice = product.selling_price;
      const tiers = product.priceTiers || [];
      const { unitPrice, activeTier } = resolveTierUnitPrice(basePrice, tiers, initialQty);
      const subtotal = calculateLineSubtotal(unitPrice, initialQty);

      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        baseUnitPrice: basePrice,
        unitPrice,
        activeTier,
        tiers,
        quantity: initialQty,
        subtotal,
        availableStock: product.current_stock,
        unit: product.unit || 'pcs',
        stockTracking: isTracked,
      };

      return [...currentCart, newItem];
    }
  }

  /**
   * Update item quantity in cart with stock limit check.
   */
  updateItemQuantity(currentCart: CartItem[], productId: string, delta: number): CartItem[] {
    const existingIndex = currentCart.findIndex((item) => item.productId === productId);
    if (existingIndex < 0) return currentCart;

    const existingItem = currentCart[existingIndex];
    const newQty = existingItem.quantity + delta;

    if (newQty <= 0) {
      return currentCart.filter((item) => item.productId !== productId);
    }

    return this.setItemQuantity(currentCart, productId, newQty);
  }

  /**
   * Remove item completely from cart.
   */
  removeItemFromCart(currentCart: CartItem[], productId: string): CartItem[] {
    return currentCart.filter((item) => item.productId !== productId);
  }

  /**
   * Revalidate cart items against fresh SQLite database stock state before checkout.
   */
  async revalidateCartStock(cart: CartItem[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const item of cart) {
      const latestProd = await productService.getProductById(item.productId);

      if (!latestProd || latestProd.is_active === 0) {
        errors.push(`Produk "${item.productName}" sudah tidak tersedia atau non-aktif.`);
      } else if (latestProd.stock_tracking === 1 && item.quantity > latestProd.current_stock) {
        errors.push(
          `Stok "${item.productName}" berubah. Tersedia: ${formatQuantity(latestProd.current_stock)} ${latestProd.unit}, di keranjang: ${formatQuantity(item.quantity)} ${item.unit}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const posService = new POSService();
