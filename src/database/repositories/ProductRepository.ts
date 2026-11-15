import { getDatabase } from '../database';
import { ProductEntity } from '../types';

export class ProductRepository {
  async getAll(includeInactive: boolean = false): Promise<ProductEntity[]> {
    const db = await getDatabase();
    if (includeInactive) {
      return db.getAllAsync<ProductEntity>(
        'SELECT * FROM products ORDER BY name ASC;'
      );
    }
    return db.getAllAsync<ProductEntity>(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC;'
    );
  }

  async getById(id: string): Promise<ProductEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<ProductEntity>(
      'SELECT * FROM products WHERE id = ?;',
      [id]
    );
  }

  async getBySKU(sku: string): Promise<ProductEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<ProductEntity>(
      'SELECT * FROM products WHERE sku = ?;',
      [sku]
    );
  }

  async getByBarcode(barcode: string): Promise<ProductEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<ProductEntity>(
      'SELECT * FROM products WHERE barcode = ?;',
      [barcode]
    );
  }

  async getByCategory(categoryId: string, includeInactive: boolean = false): Promise<ProductEntity[]> {
    const db = await getDatabase();
    if (includeInactive) {
      return db.getAllAsync<ProductEntity>(
        'SELECT * FROM products WHERE category_id = ? ORDER BY name ASC;',
        [categoryId]
      );
    }
    return db.getAllAsync<ProductEntity>(
      'SELECT * FROM products WHERE category_id = ? AND is_active = 1 ORDER BY name ASC;',
      [categoryId]
    );
  }

  async search(
    query: string,
    categoryId?: string | null,
    includeInactive: boolean = false
  ): Promise<ProductEntity[]> {
    const db = await getDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    if (!includeInactive) {
      conditions.push('is_active = 1');
    }

    if (categoryId) {
      conditions.push('category_id = ?');
      params.push(categoryId);
    }

    if (query && query.trim().length > 0) {
      const searchTerm = `%${query.trim()}%`;
      conditions.push('(name LIKE ? OR sku LIKE ? OR barcode LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM products ${whereClause} ORDER BY name ASC;`;
    return db.getAllAsync<ProductEntity>(sql, ...params);
  }

  async create(product: Omit<ProductEntity, 'created_at' | 'updated_at'>): Promise<ProductEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO products (id, category_id, sku, barcode, name, description, purchase_price, selling_price, stock_tracking, current_stock, minimum_stock, unit, image_uri, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        product.id,
        product.category_id,
        product.sku,
        product.barcode,
        product.name,
        product.description,
        product.purchase_price,
        product.selling_price,
        product.stock_tracking,
        product.current_stock,
        product.minimum_stock,
        product.unit,
        product.image_uri,
        product.is_active,
        now,
        now,
      ]
    );
    return (await this.getById(product.id))!;
  }

  async update(id: string, updates: Partial<Omit<ProductEntity, 'id' | 'created_at'>>): Promise<void> {
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
      `UPDATE products SET ${fields.join(', ')} WHERE id = ?;`,
      values
    );
  }

  async updateStock(id: string, deltaQuantity: number): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE products SET current_stock = current_stock + ?, updated_at = ? WHERE id = ?;`,
      [deltaQuantity, now, id]
    );
  }

  async setActiveStatus(id: string, isActive: boolean): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE products SET is_active = ?, updated_at = ? WHERE id = ?;`,
      [isActive ? 1 : 0, now, id]
    );
  }
}
