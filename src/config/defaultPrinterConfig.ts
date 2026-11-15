import { PrinterConfig } from '@/types/printer';

export const defaultPrinterConfig: PrinterConfig = {
  connectionType: 'bluetooth',
  printerWidth: '80mm',
  printerName: undefined,
  autoPrint: true,
  printCopies: 1,
};
