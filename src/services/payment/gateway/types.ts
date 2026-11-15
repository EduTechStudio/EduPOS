import { PaymentMethodType } from '@/types/payment';

export type PaymentGatewayType = 'mock' | 'midtrans' | 'xendit' | string;

export interface PaymentGatewayConfig {
  mode: 'mock' | 'sandbox' | 'production';
}

export interface PaymentGatewayPaymentRequest {
  transactionId: string;
  transactionNumber: string;
  amount: number;
  currency: string;
  method: PaymentMethodType;
  customerName?: string;
}

export interface PaymentGatewayPaymentResult {
  success: boolean;
  paymentId: string;
  reference?: string;
  status: 'WAITING_FOR_PAYMENT' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  amount: number;
  currency: string;
  checkoutUrl?: string;
  qrCodeData?: string;
  qrImageUrl?: string;
  instructions?: string;
  expiresAt?: string;
  raw?: any;
}

export interface PaymentGatewayStatusResult {
  paymentId: string;
  status: 'WAITING_FOR_PAYMENT' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  raw?: any;
}

export interface PaymentGateway {
  id: string;
  name: string;
  type: PaymentGatewayType;
  supportedMethods: PaymentMethodType[];

  initialize(config: PaymentGatewayConfig): Promise<void>;
  createPayment(request: PaymentGatewayPaymentRequest): Promise<PaymentGatewayPaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentGatewayStatusResult>;
  cancelPayment?(paymentId: string): Promise<PaymentGatewayStatusResult>;
  refundPayment?(paymentId: string): Promise<PaymentGatewayStatusResult>;
  testConnection?(): Promise<boolean>;
}
