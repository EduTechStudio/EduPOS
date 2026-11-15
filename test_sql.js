const Database = require('better-sqlite3');
const db = new Database(':memory:');

db.exec(`
  CREATE TABLE roles (id TEXT PRIMARY KEY NOT NULL);
  CREATE TABLE permissions (id TEXT PRIMARY KEY NOT NULL, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT);
  CREATE TABLE role_permissions (role_id TEXT NOT NULL, permission_id TEXT NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (permission_id) REFERENCES permissions(id));
  CREATE TABLE users (id TEXT PRIMARY KEY NOT NULL, role_id TEXT NOT NULL, FOREIGN KEY (role_id) REFERENCES roles(id));
`);

// Simulate old bad seed
db.exec(`
  INSERT INTO roles (id) VALUES ('owner');
  INSERT INTO permissions (id, key, name, description) VALUES ('perm_payment_gateway.manage', 'payment.gateway.manage', 'Old Name', 'Old Cat');
`);

// Now run our new migration 005 logic
db.exec(`
  INSERT OR IGNORE INTO roles (id) VALUES ('owner');
  
  INSERT INTO permissions (id, key, name, description)
  VALUES ('perm_payment_gateway_manage', 'payment.gateway.manage', 'Manage Payment Gateways', 'payment')
  ON CONFLICT(key) DO UPDATE SET name = 'Manage Payment Gateways', description = 'payment';

  INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
  SELECT 'owner', id FROM permissions WHERE key = 'payment.gateway.manage';

  INSERT OR IGNORE INTO users (id, role_id) VALUES ('user_owner', 'owner');
`);

const perms = db.prepare('SELECT * FROM permissions').all();
const rp = db.prepare('SELECT * FROM role_permissions').all();

console.log("Permissions:", perms);
console.log("Role Permissions:", rp);
