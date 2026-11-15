import { ReceiptWidth } from './receipt';

export type PrinterConnectionType = 'none' | 'bluetooth' | 'usb';

export interface PrinterConfig {
  connectionType: PrinterConnectionType;
  printerWidth: ReceiptWidth;
  printerName?: string;
  macAddress?: string;
  vendorId?: string;
  autoPrint: boolean;
  printCopies: number;
}
