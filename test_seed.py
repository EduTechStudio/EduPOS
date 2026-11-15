import sqlite3

conn = sqlite3.connect(':memory:')
c = conn.cursor()

c.execute("PRAGMA foreign_keys = ON")

c.executescript("""
  CREATE TABLE roles (id TEXT PRIMARY KEY NOT NULL);
  CREATE TABLE permissions (id TEXT PRIMARY KEY NOT NULL, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT);
  CREATE TABLE role_permissions (role_id TEXT NOT NULL, permission_id TEXT NOT NULL, PRIMARY KEY (role_id, permission_id), FOREIGN KEY (role_id) REFERENCES roles(id), FOREIGN KEY (permission_id) REFERENCES permissions(id));
  CREATE TABLE users (id TEXT PRIMARY KEY NOT NULL, role_id TEXT NOT NULL, FOREIGN KEY (role_id) REFERENCES roles(id));
""")

# Simulate old bad seed
c.executescript("""
  INSERT INTO roles (id) VALUES ('owner');
  INSERT INTO permissions (id, key, name, description) VALUES ('perm_payment_gateway.manage', 'payment.gateway.manage', 'Old Name', 'Old Cat');
""")

try:
  c.execute("INSERT OR IGNORE INTO roles (id) VALUES ('owner')")
  
  c.execute("""
    INSERT INTO permissions (id, key, name, description)
    VALUES ('perm_payment_gateway_manage', 'payment.gateway.manage', 'New Name', 'New Cat')
    ON CONFLICT(key) DO UPDATE SET name = excluded.name, description = excluded.description;
  """)

  c.execute("""
    INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
    SELECT 'owner', id FROM permissions WHERE key = 'payment.gateway.manage';
  """)

  c.execute("INSERT OR IGNORE INTO users (id, role_id) VALUES ('user_owner', 'owner')")

  conn.commit()

  c.execute("SELECT * FROM permissions")
  print("Permissions:", c.fetchall())

  c.execute("SELECT * FROM role_permissions")
  print("Role Permissions:", c.fetchall())

  c.execute("SELECT * FROM users")
  print("Users:", c.fetchall())

  c.execute("PRAGMA foreign_key_check")
  print("FK Violations:", c.fetchall())

except Exception as e:
  print("SQL Error:", e)

