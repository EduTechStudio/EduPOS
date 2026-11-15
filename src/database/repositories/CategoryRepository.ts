import { getDatabase } from '../database';
import { CategoryEntity } from '../types';

export class CategoryRepository {
  async getAll(includeInactive: boolean = false): Promise<CategoryEntity[]> {
    const db = await getDatabase();
    if (includeInactive) {
      return db.getAllAsync<CategoryEntity>(
        'SELECT * FROM categories ORDER BY sort_order ASC, name ASC;'
      );
    }
    return db.getAllAsync<CategoryEntity>(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC;'
    );
  }

  async getById(id: string): Promise<CategoryEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<CategoryEntity>(
      'SELECT * FROM categories WHERE id = ?;',
      [id]
    );
  }

  async getByName(name: string): Promise<CategoryEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<CategoryEntity>(
      'SELECT * FROM categories WHERE LOWER(name) = LOWER(?);',
      [name.trim()]
    );
  }

  async create(category: Omit<CategoryEntity, 'created_at' | 'updated_at'>): Promise<CategoryEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO categories (id, name, description, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [category.id, category.name, category.description, category.sort_order, category.is_active, now, now]
    );
    return (await this.getById(category.id))!;
  }

  async update(id: string, updates: Partial<Omit<CategoryEntity, 'id' | 'created_at'>>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?;`,
      values
    );
  }

  async setActiveStatus(id: string, isActive: boolean): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE categories SET is_active = ?, updated_at = ? WHERE id = ?;`,
      [isActive ? 1 : 0, now, id]
    );
  }
}
