import { getDatabase } from '@/database/database';

export const DEMO_PREFIX = 'DEMO_';

export async function isDemoSeeded(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM products WHERE id LIKE 'DEMO_PROD_%'`
  );
  return (row?.count ?? 0) > 0;
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomArrayElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDates(count: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  
  // Today (15)
  for (let i = 0; i < 15; i++) {
    const d = new Date(now);
    d.setHours(d.getHours() - getRandomInt(0, 10));
    d.setMinutes(getRandomInt(0, 59));
    dates.push(d.toISOString());
  }
  
  // Yesterday (10)
  for (let i = 0; i < 10; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    d.setHours(getRandomInt(8, 22));
    d.setMinutes(getRandomInt(0, 59));
    dates.push(d.toISOString());
  }
  
  // Last 7 days (25)
  for (let i = 0; i < 25; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - getRandomInt(2, 7));
    d.setHours(getRandomInt(8, 22));
    d.setMinutes(getRandomInt(0, 59));
    dates.push(d.toISOString());
  }
  
  // Earlier this month (25)
  for (let i = 0; i < 25; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - getRandomInt(8, 28));
    d.setHours(getRandomInt(8, 22));
    d.setMinutes(getRandomInt(0, 59));
    dates.push(d.toISOString());
  }
  
  // Previous month (15)
  for (let i = 0; i < 15; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    d.setDate(getRandomInt(1, 28));
    d.setHours(getRandomInt(8, 22));
    d.setMinutes(getRandomInt(0, 59));
    dates.push(d.toISOString());
  }

  // Sort dates chronologically
  dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  // Slice to exact count if needed, or return all
  return dates.slice(0, count);
}
