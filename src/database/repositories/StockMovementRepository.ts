import { getDatabase } from '../database';
import { StockMovementEntity } from '../types';

export class StockMovementRepository {
  async getByProductId(productId: string): Promise<StockMovementEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<StockMovementEntity>(
      'SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC;',
      [productId]
    );
  }

  async create(movement: Omit<StockMovementEntity, 'created_at'>): Promise<StockMovementEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO stock_movements (id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        movement.id,
        movement.product_id,
        movement.movement_type,
        movement.quantity,
        movement.reference_type,
        movement.reference_id,
        movement.notes,
        now,
      ]
    );
    return movement as StockMovementEntity;
  }
}
