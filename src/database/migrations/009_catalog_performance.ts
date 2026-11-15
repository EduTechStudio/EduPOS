import { Migration } from './001_initial_schema';

export const migration009: Migration = {
  id: 9,
  name: '009_catalog_performance',
  up: [
    // Composite index for active product sorting by name
    `CREATE INDEX IF NOT EXISTS idx_products_active_name ON products(is_active, name ASC);`,
    // Composite index for category-filtered active product sorting by name
    `CREATE INDEX IF NOT EXISTS idx_products_cat_active_name ON products(category_id, is_active, name ASC);`,
  ],
};
