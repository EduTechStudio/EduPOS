import { PaymentMethodConfig } from '@/types/payment';

export const defaultPaymentMethods: PaymentMethodConfig[] = [
  {
    id: 'cash',
    name: 'Cash Payment',
    enabled: true,
    requiresReference: false,
  },
  {
    id: 'qris',
    name: 'Manual QRIS Confirmation',
    enabled: true,
    requiresReference: true,
  },
  {
    id: 'bank_transfer',
    name: 'Manual Bank Transfer',
    enabled: true,
    requiresReference: true,
  },
  {
    id: 'debit',
    name: 'Manual Debit Card',
    enabled: true,
    requiresReference: true,
  },
  {
    id: 'qris_gateway',
    name: 'QRIS (Gateway)',
    enabled: true,
    requiresReference: false,
    isGateway: true,
  }
];
