import { getDatabase } from '../database';
import { TransactionItemEntity } from '../types';

export class TransactionItemRepository {
  async getByTransactionId(transactionId: string): Promise<TransactionItemEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<TransactionItemEntity>(
      'SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY created_at ASC;',
      [transactionId]
    );
  }

  async create(item: Omit<TransactionItemEntity, 'created_at'>): Promise<TransactionItemEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO transaction_items (id, transaction_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, discount_amount, subtotal, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.transaction_id,
        item.product_id,
        item.product_name_snapshot,
        item.sku_snapshot,
        item.quantity,
        item.unit_price,
        item.discount_amount,
        item.subtotal,
        now,
      ]
    );
    return item as TransactionItemEntity;
  }
}
