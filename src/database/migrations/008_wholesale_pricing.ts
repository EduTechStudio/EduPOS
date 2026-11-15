import { Migration } from './001_initial_schema';

export const migration008: Migration = {
  id: 8,
  name: '008_wholesale_pricing',
  up: [
    `CREATE TABLE IF NOT EXISTS product_price_tiers (
      id TEXT PRIMARY KEY NOT NULL,
      product_id TEXT NOT NULL,
      min_quantity REAL NOT NULL,
      unit_price INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE (product_id, min_quantity)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_price_tiers_product_id ON product_price_tiers(product_id);`,
    `CREATE INDEX IF NOT EXISTS idx_price_tiers_min_qty ON product_price_tiers(product_id, min_quantity ASC);`
  ]
};
