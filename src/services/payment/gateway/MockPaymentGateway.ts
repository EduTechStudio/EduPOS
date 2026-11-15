import {
  PaymentGateway,
  PaymentGatewayConfig,
  PaymentGatewayPaymentRequest,
  PaymentGatewayPaymentResult,
  PaymentGatewayStatusResult,
} from './types';

export class MockPaymentGateway implements PaymentGateway {
  id = 'mock';
  name = 'Mock Payment Gateway';
  type = 'mock';
  supportedMethods = ['qris_gateway', 'e_wallet', 'virtual_account'];
  
  private payments = new Map<string, PaymentGatewayStatusResult>();

  async initialize(config: PaymentGatewayConfig): Promise<void> {
    console.log('[MockGateway] Initialized in mode:', config.mode);
  }

  async createPayment(request: PaymentGatewayPaymentRequest): Promise<PaymentGatewayPaymentResult> {
    console.log('[MockGateway] Creating payment for:', request.transactionNumber);
    const paymentId = `MOCK-${Date.now()}-${request.transactionNumber}`;
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString(); // 15 mins

    const result: PaymentGatewayPaymentResult = {
      success: true,
      paymentId,
      reference: `REF-${paymentId}`,
      status: 'WAITING_FOR_PAYMENT',
      amount: request.amount,
      currency: request.currency,
      qrCodeData: request.method === 'qris_gateway' ? `000201010211...${paymentId}` : undefined,
      instructions: `Please pay ${request.amount} using ${request.method}.`,
      expiresAt,
    };

    this.payments.set(paymentId, {
      paymentId,
      status: 'WAITING_FOR_PAYMENT',
    });

    return result;
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentGatewayStatusResult> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found in mock gateway.`);
    }
    return payment;
  }

  // Developer endpoints to simulate webhook/status changes
  async simulateSuccess(paymentId: string): Promise<void> {
    const payment = this.payments.get(paymentId);
    if (payment) {
      this.payments.set(paymentId, { ...payment, status: 'PAID' });
    }
  }

  async simulateFailure(paymentId: string): Promise<void> {
    const payment = this.payments.get(paymentId);
    if (payment) {
      this.payments.set(paymentId, { ...payment, status: 'FAILED' });
    }
  }

  async simulateExpiration(paymentId: string): Promise<void> {
    const payment = this.payments.get(paymentId);
    if (payment) {
      this.payments.set(paymentId, { ...payment, status: 'EXPIRED' });
    }
  }

  async cancelPayment(paymentId: string): Promise<PaymentGatewayStatusResult> {
    const payment = this.payments.get(paymentId);
    if (payment && payment.status === 'WAITING_FOR_PAYMENT') {
      const updated = { ...payment, status: 'CANCELLED' as const };
      this.payments.set(paymentId, updated);
      return updated;
    }
    throw new Error('Cannot cancel payment');
  }
}
