import { getDatabase } from '../database';
import { ExpenseEntity } from '../types';

export class ExpenseRepository {
  async getAll(): Promise<ExpenseEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<ExpenseEntity>(
      'SELECT * FROM expenses ORDER BY expense_date DESC;'
    );
  }

  async create(expense: Omit<ExpenseEntity, 'created_at' | 'updated_at'>): Promise<ExpenseEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO expenses (id, category, description, amount, expense_date, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        expense.id,
        expense.category,
        expense.description,
        expense.amount,
        expense.expense_date,
        expense.notes,
        expense.created_by,
        now,
        now,
      ]
    );
    return expense as ExpenseEntity;
  }
}
