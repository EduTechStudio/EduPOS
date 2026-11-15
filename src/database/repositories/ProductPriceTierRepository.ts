import { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import { ProductPriceTierEntity } from '../types';

export class ProductPriceTierRepository {
  /**
   * Get all price tiers for a product sorted ascending by minimum quantity.
   */
  async getByProductId(productId: string, dbExecutor?: SQLiteDatabase): Promise<ProductPriceTierEntity[]> {
    const db = dbExecutor || (await getDatabase());
    return db.getAllAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers WHERE product_id = ? ORDER BY min_quantity ASC;',
      [productId]
    );
  }

  /**
   * Get all price tiers across the database sorted by minimum quantity.
   */
  async getAll(dbExecutor?: SQLiteDatabase): Promise<ProductPriceTierEntity[]> {
    const db = dbExecutor || (await getDatabase());
    return db.getAllAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers ORDER BY min_quantity ASC;'
    );
  }

  /**
   * Get price tiers grouped by product ID in a single query.
   * If productIds is provided and reasonable in size, filters by WHERE product_id IN (...).
   * Otherwise loads all tiers and groups in memory.
   */
  async getAllGrouped(
    productIds?: string[],
    dbExecutor?: SQLiteDatabase
  ): Promise<Map<string, ProductPriceTierEntity[]>> {
    const db = dbExecutor || (await getDatabase());
    const tierMap = new Map<string, ProductPriceTierEntity[]>();

    if (productIds && productIds.length === 0) {
      return tierMap;
    }

    let tiers: ProductPriceTierEntity[];
    if (productIds && productIds.length <= 500) {
      const placeholders = productIds.map(() => '?').join(', ');
      tiers = await db.getAllAsync<ProductPriceTierEntity>(
        `SELECT * FROM product_price_tiers WHERE product_id IN (${placeholders}) ORDER BY min_quantity ASC;`,
        productIds
      );
    } else {
      tiers = await db.getAllAsync<ProductPriceTierEntity>(
        'SELECT * FROM product_price_tiers ORDER BY min_quantity ASC;'
      );
    }

    const filterSet = productIds ? new Set(productIds) : null;
    for (const tier of tiers) {
      if (filterSet && !filterSet.has(tier.product_id)) {
        continue;
      }
      let list = tierMap.get(tier.product_id);
      if (!list) {
        list = [];
        tierMap.set(tier.product_id, list);
      }
      list.push(tier);
    }

    return tierMap;
  }

  /**
   * Get a single price tier by its primary ID.
   */
  async getById(id: string): Promise<ProductPriceTierEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers WHERE id = ?;',
      [id]
    );
  }

  /**
   * Create a new wholesale price tier.
   */
  async create(
    tier: Omit<ProductPriceTierEntity, 'created_at' | 'updated_at'>
  ): Promise<ProductPriceTierEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO product_price_tiers (id, product_id, min_quantity, unit_price, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [tier.id, tier.product_id, tier.min_quantity, tier.unit_price, now, now]
    );
    return (await this.getById(tier.id))!;
  }

  /**
   * Delete a price tier by its primary ID.
   */
  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM product_price_tiers WHERE id = ?;', [id]);
  }

  /**
   * Delete all price tiers for a specific product.
   */
  async deleteByProductId(productId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM product_price_tiers WHERE product_id = ?;', [productId]);
  }

  /**
   * Atomically replace all wholesale price tiers for a product.
   * If a dbExecutor (active transaction) is provided, statements execute directly within it.
   */
  async replaceForProduct(
    productId: string,
    tiers: Array<{ min_quantity: number; unit_price: number }>,
    dbExecutor?: SQLiteDatabase
  ): Promise<ProductPriceTierEntity[]> {
    const db = dbExecutor || (await getDatabase());
    const now = new Date().toISOString();
    const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

    const executeOperations = async (targetDb: SQLiteDatabase) => {
      await targetDb.runAsync('DELETE FROM product_price_tiers WHERE product_id = ?;', [productId]);

      for (let i = 0; i < sortedTiers.length; i++) {
        const t = sortedTiers[i];
        const id = `tier_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`;
        await targetDb.runAsync(
          `INSERT INTO product_price_tiers (id, product_id, min_quantity, unit_price, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [id, productId, t.min_quantity, t.unit_price, now, now]
        );
      }
    };

    if (dbExecutor) {
      await executeOperations(dbExecutor);
    } else {
      await db.withTransactionAsync(async () => {
        await executeOperations(db);
      });
    }

    const queryDb = dbExecutor || (await getDatabase());
    return queryDb.getAllAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers WHERE product_id = ? ORDER BY min_quantity ASC;',
      [productId]
    );
  }
}
