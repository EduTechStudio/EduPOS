import { ProductRepository } from '@/database/repositories/ProductRepository';
import { ProductPriceTierRepository } from '@/database/repositories/ProductPriceTierRepository';
import { ProductEntity, ProductPriceTierEntity } from '@/database/types';
import { barcodeService } from './BarcodeService';

const productRepository = new ProductRepository();
const productPriceTierRepository = new ProductPriceTierRepository();

export class BarcodeLookupService {
  /**
   * Looks up a product exactly by its barcode, including active wholesale price tiers.
   */
  async lookupProductByBarcode(
    barcode: string
  ): Promise<(ProductEntity & { priceTiers?: ProductPriceTierEntity[] }) | null> {
    const normalized = barcodeService.normalizeBarcode(barcode);
    if (!normalized) return null;
    const product = await productRepository.getByBarcode(normalized);
    if (!product) return null;

    try {
      const tiers = await productPriceTierRepository.getByProductId(product.id);
      return { ...product, priceTiers: tiers };
    } catch {
      return { ...product, priceTiers: [] };
    }
  }
}

export const barcodeLookupService = new BarcodeLookupService();
