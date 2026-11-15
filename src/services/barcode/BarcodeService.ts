import { BarcodeScanResult, BarcodeSource } from './types';

export class BarcodeService {
  /**
   * Normalizes a barcode string.
   * - Trims whitespace
   * - Preserves leading zeroes
   * - Never converts to Number
   */
  normalizeBarcode(value: string | null | undefined): string {
    if (!value) return '';
    return value.trim();
  }

  /**
   * Wrapper for scan results coming from the camera/hardware.
   */
  createScanResult(value: string, source: BarcodeSource, format?: string): BarcodeScanResult | null {
    const normalized = this.normalizeBarcode(value);
    if (!normalized) return null;
    return {
      value: normalized,
      source,
      format,
      timestamp: Date.now()
    };
  }
}

export const barcodeService = new BarcodeService();
