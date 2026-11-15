export * from './receiptTemplate';
export * from './receiptDocument';

export interface ReceiptConfig {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  logo?: string;
  showHeader: boolean;
  showStoreAddress?: boolean;
  showStorePhone?: boolean;
  showLogo?: boolean;
  showFooter: boolean;
  footerText: string;
  showCashier: boolean;
  showTransactionNumber: boolean;
  showDateTime: boolean;
  showCustomer: boolean;
  showPaymentMethod: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showSubtotal: boolean;
  showTotal: boolean;
  showChange: boolean;
  receiptWidth: import('./receiptTemplate').ReceiptWidth;
}
