import { getDatabase } from '../database';
import { PaymentEntity } from '../types';

export class PaymentRepository {
  async getByTransactionId(transactionId: string): Promise<PaymentEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<PaymentEntity>(
      'SELECT * FROM payments WHERE transaction_id = ? ORDER BY created_at ASC;',
      [transactionId]
    );
  }

  async create(payment: Omit<PaymentEntity, 'created_at' | 'updated_at'>): Promise<PaymentEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO payments (id, transaction_id, payment_method, amount, received_amount, change_amount, reference_number, status, paid_at, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        payment.id,
        payment.transaction_id,
        payment.payment_method,
        payment.amount,
        payment.received_amount,
        payment.change_amount,
        payment.reference_number,
        payment.status,
        payment.paid_at || now,
        payment.notes,
        now,
        now,
      ]
    );
    return payment as PaymentEntity;
  }
}
