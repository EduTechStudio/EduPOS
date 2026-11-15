import { getDatabase } from '../database';
import { CustomerEntity } from '../types';
import { authorizationService } from '../../services/auth/AuthorizationService';

export class CustomerRepository {
  async getAll(): Promise<CustomerEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<CustomerEntity>(
      'SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC;'
    );
  }

  async getById(id: string): Promise<CustomerEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<CustomerEntity>(
      'SELECT * FROM customers WHERE id = ?;',
      [id]
    );
  }

  async create(customer: Omit<CustomerEntity, 'created_at' | 'updated_at'>): Promise<CustomerEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO customers (id, name, phone, email, address, notes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        customer.id,
        customer.name,
        customer.phone,
        customer.email,
        customer.address,
        customer.notes,
        customer.is_active,
        now,
        now,
      ]
    );
    return (await this.getById(customer.id))!;
  }

  async update(id: string, updates: Partial<Omit<CustomerEntity, 'id' | 'created_at'>>): Promise<CustomerEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    let updateFields = [];
    let values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'updated_at') {
        updateFields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const query = `UPDATE customers SET ${updateFields.join(', ')} WHERE id = ?;`;
    await db.runAsync(query, values);
    
    return (await this.getById(id))!;
  }

  async softDelete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      'UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?;',
      [now, id]
    );
  }
}

