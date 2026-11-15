import { PaymentMethodType } from './payment';
import { ReceiptConfig } from './receipt';

export interface TransactionItem {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  createdAt: string;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: TransactionItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  receivedAmount: number;
  changeAmount: number;
  referenceNumber?: string;
  status: 'completed' | 'voided' | 'refunded';
}

export interface ReceiptData {
  transaction: Transaction;
  receiptConfig: ReceiptConfig;
  formattedDate: string;
  formattedTime: string;
}
