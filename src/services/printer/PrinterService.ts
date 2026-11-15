import { PrinterConfig } from '@/types/printer';
import { ReceiptData } from '@/services/receipt/ReceiptService';

export interface IPrinterService {
  connect(config: PrinterConfig): Promise<boolean>;
  disconnect(): Promise<boolean>;
  isConnected(): boolean;
  printReceipt(receiptData: ReceiptData): Promise<boolean>;
  testPrint(): Promise<boolean>;
  setConfig?(config: PrinterConfig): void;
  getConfig?(): PrinterConfig | null;
}

export abstract class BasePrinterService implements IPrinterService {
  protected config: PrinterConfig | null = null;
  protected connected: boolean = false;

  public setConfig(config: PrinterConfig): void {
    this.config = config;
  }

  public getConfig(): PrinterConfig | null {
    return this.config;
  }

  abstract connect(config: PrinterConfig): Promise<boolean>;
  abstract disconnect(): Promise<boolean>;
  
  isConnected(): boolean {
    return this.connected;
  }

  abstract printReceipt(receiptData: ReceiptData): Promise<boolean>;
  abstract testPrint(): Promise<boolean>;
}
