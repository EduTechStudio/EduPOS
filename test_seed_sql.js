const Database = require('better-sqlite3');
const db = new Database(':memory:');

db.exec(`
  CREATE TABLE roles (id TEXT PRIMARY KEY NOT NULL);
  CREATE TABLE permissions (id TEXT PRIMARY KEY NOT NULL, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT);
  CREATE TABLE role_permissions (role_id TEXT NOT NULL, permission_id TEXT NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (permission_id) REFERENCES permissions(id));
  CREATE TABLE users (id TEXT PRIMARY KEY NOT NULL, role_id TEXT NOT NULL, FOREIGN KEY (role_id) REFERENCES roles(id));
  
  PRAGMA foreign_keys = ON;
`);

// Simulate old bad seed
db.exec(`
  INSERT INTO roles (id) VALUES ('owner');
  INSERT INTO permissions (id, key, name, description) VALUES ('perm_payment_gateway.manage', 'payment.gateway.manage', 'Old Name', 'Old Cat');
`);

// Now run our NEW seed.ts logic
try {
  // 1. Roles
  db.prepare(`INSERT OR IGNORE INTO roles (id) VALUES ('owner')`).run();
  
  // 2. Permissions (ON CONFLICT DO UPDATE)
  db.prepare(`
    INSERT INTO permissions (id, key, name, description)
    VALUES ('perm_payment_gateway_manage', 'payment.gateway.manage', 'New Name', 'New Cat')
    ON CONFLICT(key) DO UPDATE SET name = excluded.name, description = excluded.description;
  `).run();

  // 3. Role Permissions
  db.prepare(`
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    SELECT 'owner', id FROM permissions WHERE key = 'payment.gateway.manage';
  `).run();

  // 4. Users
  db.prepare(`
    INSERT OR IGNORE INTO users (id, role_id) VALUES ('user_owner', 'owner');
  `).run();

  const perms = db.prepare('SELECT * FROM permissions').all();
  const rp = db.prepare('SELECT * FROM role_permissions').all();
  const users = db.prepare('SELECT * FROM users').all();
  
  const fkViolations = db.prepare('PRAGMA foreign_key_check').all();

  console.log("Permissions:", perms);
  console.log("Role Permissions:", rp);
  console.log("Users:", users);
  console.log("FK Violations:", fkViolations);

} catch (e) {
  console.error("SQL Error:", e.message);
}
