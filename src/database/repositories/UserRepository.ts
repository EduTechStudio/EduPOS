import { getDatabase } from '../database';
import { UserEntity } from '../types';

export class UserRepository {
  async getAll(): Promise<UserEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<UserEntity>(
      'SELECT * FROM users ORDER BY name ASC;'
    );
  }

  async getActiveUsers(): Promise<UserEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<UserEntity>(
      'SELECT * FROM users WHERE is_active = 1 ORDER BY name ASC;'
    );
  }

  async getById(id: string): Promise<UserEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<UserEntity>(
      'SELECT * FROM users WHERE id = ?;',
      [id]
    );
  }

  async getByUsername(username: string): Promise<UserEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<UserEntity>(
      'SELECT * FROM users WHERE username = ?;',
      [username]
    );
  }

  async create(user: Omit<UserEntity, 'created_at' | 'updated_at'>): Promise<UserEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO users (id, name, username, pin_hash, role_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [user.id, user.name, user.username, user.pin_hash, user.role_id, user.is_active, now, now]
    );
    return (await this.getById(user.id))!;
  }

  async update(id: string, user: Partial<Omit<UserEntity, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const existing = await this.getById(id);
    if (existing?.role_id === 'owner' && user.role_id && user.role_id !== 'owner') {
      throw new Error('Tidak dapat mengubah peran akun Owner.');
    }
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    const sets = [];
    const values = [];
    if (user.name !== undefined) { sets.push('name = ?'); values.push(user.name); }
    if (user.username !== undefined) { sets.push('username = ?'); values.push(user.username); }
    if (user.pin_hash !== undefined) { sets.push('pin_hash = ?'); values.push(user.pin_hash); }
    if (user.role_id !== undefined) { sets.push('role_id = ?'); values.push(user.role_id); }
    if (user.is_active !== undefined) { sets.push('is_active = ?'); values.push(user.is_active); }
    
    if (sets.length === 0) return;
    
    sets.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    await db.runAsync(
      `UPDATE users SET ${sets.join(', ')} WHERE id = ?;`,
      values
    );
  }

  async getActiveOwners(): Promise<UserEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<UserEntity>(
      "SELECT * FROM users WHERE role_id = 'owner' AND is_active = 1;"
    );
  }

  async hasHistoricalReferences(userId: string): Promise<{
    hasHistory: boolean;
    transactions: number;
    expenses: number;
    draftSales: number;
  }> {
    const db = await getDatabase();

    let transactions = 0;
    try {
      const txRow = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM transactions WHERE cashier_id = ?;',
        [userId]
      );
      transactions = txRow?.count ?? 0;
    } catch (txErr) {
      console.warn('[UserRepository] Could not check transactions historical references:', txErr);
    }

    let expenses = 0;
    try {
      const expRow = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM expenses WHERE created_by = ?;',
        [userId]
      );
      expenses = expRow?.count ?? 0;
    } catch (expErr) {
      console.warn('[UserRepository] Could not check expenses historical references:', expErr);
    }

    let draftSales = 0;
    try {
      const draftRow = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM draft_sales WHERE created_by = ? OR cancelled_by = ?;',
        [userId, userId]
      );
      draftSales = draftRow?.count ?? 0;
    } catch (draftErr) {
      console.warn('[UserRepository] Could not check draft_sales historical references:', draftErr);
    }

    const hasHistory = (transactions + expenses + draftSales) > 0;
    return { hasHistory, transactions, expenses, draftSales };
  }

  async delete(id: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync('DELETE FROM users WHERE id = ?;', [id]);
    return (result?.changes ?? 0) > 0;
  }

  async deactivate(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (existing?.id === 'user_owner' || existing?.username === 'owner') {
      throw new Error('Akun System Owner utama tidak dapat dinonaktifkan.');
    }
    if (existing?.role_id === 'owner') {
      const activeOwners = await this.getActiveOwners();
      if (activeOwners.length <= 1) {
        throw new Error('Akun Owner terakhir tidak dapat dinonaktifkan.');
      }
    }
    
    await this.update(id, { is_active: 0 });
  }

  async activate(id: string): Promise<void> {
    await this.update(id, { is_active: 1 });
  }
}
