import { getDatabase } from '@/database/database';
import { generateDates, getRandomInt, getRandomArrayElement } from './seedUtils';

const EXPENSE_CATEGORIES = [
  'Electricity',
  'Internet',
  'Rent',
  'Packaging',
  'Cleaning supplies',
  'Transportation',
  'Maintenance',
  'Office supplies',
  'Employee meal',
  'Equipment maintenance'
];

export async function seedDemoExpenses(): Promise<number> {
  const db = await getDatabase();
  const dates = generateDates(25);
  let count = 0;

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const cat = getRandomArrayElement(EXPENSE_CATEGORIES);
    const amount = getRandomInt(50, 500) * 1000; // 50k to 500k
    
    await db.runAsync(
      `INSERT OR IGNORE INTO expenses (id, category, description, amount, expense_date, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [`DEMO_EXP_${i}`, cat, `Demo ${cat}`, amount, date, 'Demo expense', 'user_owner', date, date]
    );
    count++;
  }

  return count;
}
