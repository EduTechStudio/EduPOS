export type BarcodeSource = 'camera' | 'manual' | 'hardware';

export interface BarcodeScanResult {
  value: string;
  source: BarcodeSource;
  format?: string;
  timestamp: number;
}
