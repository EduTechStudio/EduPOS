import { Migration } from './001_initial_schema';

export const migration004: Migration = {
  id: 4,
  name: '004_draft_sales_upgrade',
  up: [
    `ALTER TABLE draft_sales ADD COLUMN discount_type TEXT DEFAULT 'FIXED';`,
    `ALTER TABLE draft_sales ADD COLUMN discount_value INTEGER DEFAULT 0;`
  ]
};
