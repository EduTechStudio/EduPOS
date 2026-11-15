import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';
import { seedDatabase } from './seed';

const DATABASE_NAME = 'store-pos.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initCallCount = 0;

/**
 * Get or initialize the centralized SQLite database instance safely.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const currentCall = ++initCallCount;

  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    console.log(`[Database] getDatabase() call #${currentCall}: Reusing existing in-flight initPromise.`);
    return initPromise;
  }

  console.log(`[Database] getDatabase() call #${currentCall}: Starting fresh initialization.`);

  initPromise = (async () => {
    try {
      console.log(`[Database] [Stage 1/5] Opening database: ${DATABASE_NAME}...`);
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      console.log(`[Database] [Stage 1/5] Database opened.`);

      // Configure SQLite Pragmas for data integrity, concurrency, and performance
      console.log(`[Database] [Stage 2/5] Setting Pragmas (foreign_keys, journal_mode, busy_timeout)...`);
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await db.execAsync('PRAGMA busy_timeout = 5000;');
      console.log(`[Database] [Stage 2/5] Pragmas configured successfully.`);

      console.log(`[Database] [Stage 3/5] Starting runMigrations...`);
      await runMigrations(db);
      console.log(`[Database] [Stage 3/5] Migrations completed successfully.`);

      console.log(`[Database] [Stage 4/5] Starting seedDatabase...`);
      await seedDatabase(db);
      console.log(`[Database] [Stage 4/5] Seeding completed successfully.`);

      dbInstance = db;
      console.log('[Database] [Stage 5/5] Database initialized and ready.');
      return db;
    } catch (error: any) {
      console.error('[Database] Failed to initialize database:', error?.message || error);
      console.error('[Database] Initialization error stack:', error?.stack);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Execute an atomic multi-step operation within a database transaction.
 */
export async function withTransaction<T>(
  callback: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  let result: T;

  await db.withTransactionAsync(async () => {
    result = await callback(db);
  });

  return result!;
}
