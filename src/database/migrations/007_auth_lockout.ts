import { Migration } from './001_initial_schema';

export const migration007: Migration = {
  id: 7,
  name: '007_auth_lockout',
  up: [
    `CREATE TABLE IF NOT EXISTS auth_lockout (
      id TEXT PRIMARY KEY NOT NULL,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      updated_at TEXT NOT NULL
    );`,
    `INSERT OR IGNORE INTO auth_lockout (id, failed_attempts, locked_until, updated_at)
     VALUES ('global_pos_lockout', 0, NULL, CURRENT_TIMESTAMP);`
  ]
};
