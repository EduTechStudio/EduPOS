import { getDatabase } from '@/database/database';

/**
 * Generate a unique, human-readable offline transaction number.
 * Format: TRX-YYYYMMDD-XXX
 * Example: TRX-20261002-001
 */
export async function generateTransactionNumber(): Promise<string> {
  const db = await getDatabase();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `TRX-${dateStr}-`;

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE transaction_number LIKE ?;`,
    [`${prefix}%`]
  );

  const nextSeq = (row?.count || 0) + 1;
  const seqPadded = String(nextSeq).padStart(3, '0');
  
  return `${prefix}${seqPadded}`;
}
