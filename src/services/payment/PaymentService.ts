import {
  PaymentCalculationInput,
  PaymentCalculationResult,
  PaymentProcessPayload,
  PaymentMethodType
} from '@/types/payment';
import { paymentGatewayManager } from './gateway/PaymentGatewayManager';
import { PaymentGatewayPaymentRequest, PaymentGatewayPaymentResult } from './gateway/types';
import { paymentRepository } from '@/database';

export interface IPaymentService {
  calculateCashChange(input: PaymentCalculationInput): PaymentCalculationResult;
  processPayment(payload: PaymentProcessPayload): Promise<{ success: boolean; transactionId?: string; message?: string }>;
  createGatewayPayment(request: PaymentGatewayPaymentRequest): Promise<PaymentGatewayPaymentResult>;
  checkGatewayStatus(paymentId: string): Promise<PaymentGatewayPaymentResult>;
}

export class PaymentService implements IPaymentService {
  calculateCashChange(input: PaymentCalculationInput): PaymentCalculationResult {
    const { totalAmount, receivedAmount } = input;
    const changeAmount = Math.max(0, receivedAmount - totalAmount);
    const isSufficient = receivedAmount >= totalAmount;

    return {
      totalAmount,
      receivedAmount,
      changeAmount,
      isSufficient,
    };
  }

  async processPayment(
    payload: PaymentProcessPayload
  ): Promise<{ success: boolean; transactionId?: string; message?: string }> {
    return {
      success: true,
      transactionId: `TX-${Date.now()}`,
      message: 'Payment simulated successfully',
    };
  }

  async createGatewayPayment(request: PaymentGatewayPaymentRequest): Promise<PaymentGatewayPaymentResult> {
    const gateway = paymentGatewayManager.getActiveGateway();
    const result = await gateway.createPayment(request);
    return result;
  }

  async checkGatewayStatus(paymentId: string): Promise<PaymentGatewayPaymentResult> {
    const gateway = paymentGatewayManager.getActiveGateway();
    const statusResult = await gateway.getPaymentStatus(paymentId);
    
    // We can map the statusResult to a normalized shape. We'll return it as PaymentGatewayPaymentResult for simplicity.
    return {
      success: statusResult.status === 'PAID',
      paymentId: statusResult.paymentId,
      status: statusResult.status,
      amount: 0,
      currency: 'IDR', // Not deeply needed just for status check, but part of shape
    };
  }
}
export const paymentService = new PaymentService();
