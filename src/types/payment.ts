// Manual and gateway methods
export type PaymentMethodType = 'cash' | 'qris' | 'bank_transfer' | 'debit' | 'qris_gateway' | 'e_wallet' | 'virtual_account' | string;

export interface PaymentGatewayConfig {
  mode: 'mock' | 'sandbox' | 'production';
  activeProvider: string;
}

export interface PaymentMethodConfig {
  id: PaymentMethodType;
  name: string;
  enabled: boolean;
  requiresReference: boolean;
  isGateway?: boolean;
}

export interface PaymentCalculationInput {
  totalAmount: number;
  receivedAmount: number;
}

export interface PaymentCalculationResult {
  totalAmount: number;
  receivedAmount: number;
  changeAmount: number;
  isSufficient: boolean;
}

export interface PaymentProcessPayload {
  method: PaymentMethodType;
  totalAmount: number;
  receivedAmount: number;
  referenceNumber?: string;
  notes?: string;
}
