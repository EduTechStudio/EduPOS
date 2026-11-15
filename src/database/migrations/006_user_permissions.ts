import { Migration } from './001_initial_schema';

export const migration006: Migration = {
  id: 6,
  name: '006_user_permissions',
  up: [
    `CREATE TABLE IF NOT EXISTS user_permissions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      effect TEXT NOT NULL CHECK(effect IN ('GRANT', 'DENY')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
      UNIQUE(user_id, permission_id)
    );`
  ]
};
