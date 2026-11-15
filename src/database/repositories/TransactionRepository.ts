import { getDatabase } from '../database';
import { TransactionEntity } from '../types';

export interface TransactionQueryOptions {
  search?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export class TransactionRepository {
  async getAll(): Promise<TransactionEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<TransactionEntity>(
      'SELECT * FROM transactions ORDER BY created_at DESC;'
    );
  }

  async getFiltered(options: TransactionQueryOptions): Promise<TransactionEntity[]> {
    const db = await getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.search && options.search.trim().length > 0) {
      const searchTerm = `%${options.search.trim()}%`;
      conditions.push('(t.transaction_number LIKE ? OR c.name LIKE ? OR t.notes LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (options.startDate) {
      conditions.push('t.created_at >= ?');
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push('t.created_at <= ?');
      params.push(options.endDate);
    }

    if (options.status) {
      conditions.push('t.status = ?');
      params.push(options.status);
    }

    if (options.paymentMethod) {
      conditions.push('EXISTS (SELECT 1 FROM payments p WHERE p.transaction_id = t.id AND p.payment_method = ?)');
      params.push(options.paymentMethod);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    let query = `
      SELECT t.* 
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.id
      ${whereClause}
      ORDER BY t.created_at DESC
    `;

    if (options.limit !== undefined) {
      query += ` LIMIT ${Number(options.limit)}`;
      if (options.offset !== undefined) {
        query += ` OFFSET ${Number(options.offset)}`;
      }
    }

    return db.getAllAsync<TransactionEntity>(query, ...params);
  }

  async getById(id: string): Promise<TransactionEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<TransactionEntity>(
      'SELECT * FROM transactions WHERE id = ?;',
      [id]
    );
  }

  async getByNumber(transactionNumber: string): Promise<TransactionEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<TransactionEntity>(
      'SELECT * FROM transactions WHERE transaction_number = ?;',
      [transactionNumber]
    );
  }

  async create(tx: Omit<TransactionEntity, 'created_at' | 'updated_at'>): Promise<TransactionEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO transactions (id, transaction_number, customer_id, cashier_id, status, subtotal, discount_amount, tax_amount, total_amount, payment_status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        tx.id,
        tx.transaction_number,
        tx.customer_id,
        tx.cashier_id,
        tx.status,
        tx.subtotal,
        tx.discount_amount,
        tx.tax_amount,
        tx.total_amount,
        tx.payment_status,
        tx.notes,
        now,
        now,
      ]
    );
    return (await this.getById(tx.id))!;
  }

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM transactions WHERE id = ?;', [id]);
    return (result?.changes ?? 0) > 0;
  }
}

