import { BasePrinterService } from './PrinterService';
import { PrinterConfig } from '@/types/printer';
import { ReceiptData } from '@/services/receipt/ReceiptService';

export class MockPrinterService extends BasePrinterService {
  async connect(config: PrinterConfig): Promise<boolean> {
    this.config = config;
    this.connected = true;
    console.log('[MockPrinterService] Connected with config:', config);
    return true;
  }

  async disconnect(): Promise<boolean> {
    this.connected = false;
    console.log('[MockPrinterService] Disconnected');
    return true;
  }

  async printReceipt(receiptData: ReceiptData): Promise<boolean> {
    if (!this.connected) {
      console.warn('[MockPrinterService] Cannot print - printer not connected');
      return false;
    }
    console.log('[MockPrinterService] Printing receipt for transaction:', receiptData.transaction.transactionNumber);
    return true;
  }

  async testPrint(): Promise<boolean> {
    console.log('[MockPrinterService] Printing test receipt');
    return true;
  }
}
