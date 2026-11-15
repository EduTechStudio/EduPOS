# Payment Gateway Architecture (Phase 10)

## 1. Payment Architecture
The store-pos-mobile app now features a provider-agnostic Payment Gateway architecture.
Instead of coupling directly to a payment provider's API (e.g. Midtrans, Xendit), the system abstracts payments through:
`CheckoutService` -> `PaymentService` -> `PaymentGatewayManager` -> `PaymentGateway`

## 2. Provider Interface
Providers must implement the `PaymentGateway` interface:
```typescript
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
```

## 3. Mock Gateway
A `MockPaymentGateway` has been implemented for development. It generates mock payment IDs and responds with `WAITING_FOR_PAYMENT`.
It exposes methods to simulate successful (`PAID`), `FAILED`, `EXPIRED`, and `CANCELLED` states.

## 4. Payment Lifecycle
1. **Cart & Prep**: User adds items and proceeds to checkout.
2. **Intent Creation**: For gateway methods, `CheckoutService.createGatewayCheckoutIntent` creates a transaction with status `PENDING` and a payment with status `WAITING_FOR_PAYMENT`. The remote gateway is called.
3. **Waiting & Polling**: The UI displays a waiting modal. It polls `PaymentService.checkGatewayStatus`.
4. **Finalization**: If paid, `CheckoutService.finalizeGatewayCheckout` fires, completing the transaction, updating stock, and enabling the receipt.
5. **Failure/Expiration**: If failed, `CheckoutService.failGatewayCheckout` marks both transaction and payment as FAILED/CANCELLED. Stock is untouched.

## 5. Manual vs Gateway Payments
Manual payments (Cash, Manual QRIS, Manual Transfer, Debit) instantly finalize checkout, assuming the cashier has visually verified the payment. Gateway payments depend on webhook or polling verification.

## 6. Offline Behavior
Cash and manual methods function perfectly offline.
Gateway methods require internet connectivity. They should be disabled or will fail naturally with network errors when offline.

## 7. Security
API keys or server keys for real gateways must NOT be stored inside this client app.
Future production implementation should utilize a backend relay to securely generate transaction tokens.

## 8. Idempotency & Pending Recovery
Gateway payments use local references (like transaction ID). The architecture guarantees that duplicate finalizing cannot happen, as checking for `COMPLETED` happens during finalization.
Pending payments recovery on app restart has been planned for (transaction remains `PENDING`, payment `WAITING_FOR_PAYMENT`).

## 9. Next Steps for Real Provider Integration
When credentials become available, implement `MidtransPaymentGateway` or `XenditPaymentGateway`, register them in `PaymentGatewayManager`, and provide a production flag in settings.

**NOTE: Mock payment success is NOT real payment confirmation.**
