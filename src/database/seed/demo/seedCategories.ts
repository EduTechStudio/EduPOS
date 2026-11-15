import { getDatabase } from '@/database/database';

export const DEMO_CATEGORIES = [
  { id: 'DEMO_CAT_001', name: 'Beverages', description: 'Drinks and beverages' },
  { id: 'DEMO_CAT_002', name: 'Food', description: 'Main dishes' },
  { id: 'DEMO_CAT_003', name: 'Bakery', description: 'Bread and pastries' },
  { id: 'DEMO_CAT_004', name: 'Snacks', description: 'Chips and small snacks' },
  { id: 'DEMO_CAT_005', name: 'Household', description: 'Household items' },
  { id: 'DEMO_CAT_006', name: 'Personal Care', description: 'Personal care items' },
  { id: 'DEMO_CAT_007', name: 'Frozen Food', description: 'Frozen meals' },
  { id: 'DEMO_CAT_008', name: 'Other', description: 'Other items' },
];

export async function seedDemoCategories(): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  let count = 0;

  for (let i = 0; i < DEMO_CATEGORIES.length; i++) {
    const cat = DEMO_CATEGORIES[i];
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, description, sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?);`,
      [cat.id, cat.name, cat.description, i, now, now]
    );
    // Determine if it was inserted by checking if created_at == now? 
    // We just count the array length for now to keep it simple and idempotent.
    count++;
  }

  return count;
}
