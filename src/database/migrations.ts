import { SQLiteDatabase } from 'expo-sqlite';
import { migration001, Migration } from './migrations/001_initial_schema';
import { migration002 } from './migrations/002_payment_gateway';
import { migration003 } from './migrations/003_draft_sales';
import { migration004 } from './migrations/004_draft_sales_upgrade';
import { migration005 } from './migrations/005_rbac_seed';
import { migration006 } from './migrations/006_user_permissions';
import { migration007 } from './migrations/007_auth_lockout';
import { migration008 } from './migrations/008_wholesale_pricing';
import { migration009 } from './migrations/009_catalog_performance';

const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Ensure migration tracking table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Get list of already applied migration IDs
  const appliedRows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM _migrations ORDER BY id ASC;'
  );
  const appliedIds = new Set(appliedRows.map((r) => r.id));
  console.log(`[Migrations] Tracking verified. Currently applied migration IDs: [${Array.from(appliedIds).join(', ')}]`);

  // Run pending migrations in ascending order
  for (const migration of MIGRATIONS) {
    if (!appliedIds.has(migration.id)) {
      console.log(`[Database] Executing migration ${migration.id}: ${migration.name}`);
      
      await db.withTransactionAsync(async () => {
        for (let i = 0; i < migration.up.length; i++) {
          const statement = migration.up[i];
          try {
            await db.execAsync(statement);
          } catch (e: any) {
            console.error(`[Database] MIGRATION STATEMENT FAILED`);
            console.error(`Migration: ${migration.id} ${migration.name}`);
            console.error(`Statement index: ${i}`);
            console.error(`SQL: ${statement.substring(0, 500)}`);
            console.error(`Error:`, e);
            throw e;
          }
        }
        
        await db.runAsync(
          'INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?);',
          [migration.id, migration.name, new Date().toISOString()]
        );
      });
      
      console.log(`[Database] Migration ${migration.id} applied successfully.`);
    }
  }
}
