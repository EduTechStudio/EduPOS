import { Migration } from './001_initial_schema';

export const migration003: Migration = {
  id: 3,
  name: '003_draft_sales',
  up: [
    `CREATE TABLE IF NOT EXISTS draft_sales (
      id TEXT PRIMARY KEY,
      draft_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      customer_id TEXT,
      subtotal INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      cancelled_by TEXT,
      cancelled_at TEXT,
      cancellation_reason TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );`,
    `CREATE TABLE IF NOT EXISTS draft_sale_items (
      id TEXT PRIMARY KEY,
      draft_sale_id TEXT NOT NULL,
      product_id TEXT,
      product_name_snapshot TEXT NOT NULL,
      sku_snapshot TEXT,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      FOREIGN KEY (draft_sale_id) REFERENCES draft_sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );`
  ]
};
