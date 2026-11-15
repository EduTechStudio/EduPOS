import { PaymentGateway, PaymentGatewayConfig } from './types';
import { MockPaymentGateway } from './MockPaymentGateway';

export class PaymentGatewayManager {
  private static instance: PaymentGatewayManager;
  private gateways = new Map<string, PaymentGateway>();
  private activeGatewayId: string | null = null;

  private constructor() {
    this.registerGateway(new MockPaymentGateway());
    // TODO(PHASE-10-REAL-PROVIDER): Register Midtrans, Xendit, etc. here when ready.
  }

  public static getInstance(): PaymentGatewayManager {
    if (!this.instance) {
      this.instance = new PaymentGatewayManager();
    }
    return this.instance;
  }

  public registerGateway(gateway: PaymentGateway) {
    this.gateways.set(gateway.id, gateway);
  }

  public async initialize(config: PaymentGatewayConfig & { activeProvider: string }): Promise<void> {
    const gateway = this.gateways.get(config.activeProvider);
    if (!gateway) {
      throw new Error(`Gateway provider ${config.activeProvider} not found.`);
    }
    this.activeGatewayId = config.activeProvider;
    await gateway.initialize(config);
  }

  public getActiveGateway(): PaymentGateway {
    if (!this.activeGatewayId) {
      // Default to mock if not initialized explicitly
      this.activeGatewayId = 'mock';
    }
    const gateway = this.gateways.get(this.activeGatewayId);
    if (!gateway) {
      throw new Error('Active gateway not found.');
    }
    return gateway;
  }
}

export const paymentGatewayManager = PaymentGatewayManager.getInstance();
