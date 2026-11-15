const fs = require('fs');
let code = fs.readFileSync('src/database/seed.ts', 'utf-8');

const rewrite = `    // 2. Seed Permissions
    for (const perm of allPermissions) {
      await db.runAsync(
        \`INSERT INTO permissions (id, key, name, description, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET name = excluded.name, description = excluded.description;\`,
        [\`perm_\${perm.key.replace(/\\./g, '_')}\`, perm.key, perm.label, perm.category || null, now]
      );
    }

    // 3. Seed Role Permissions
    for (const rp of defaultRolePermissions) {
      for (const permKey of rp.permissions) {
        await db.runAsync(
          \`INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
           SELECT ?, id FROM permissions WHERE key = ?;\`,
          [rp.roleId, permKey]
        );
      }
    }`;

code = code.replace(
  /\/\/ 2\. Seed Permissions[\s\S]*?\/\/ 4\. Seed Default Users/,
  rewrite + "\n\n    // 4. Seed Default Users"
);

fs.writeFileSync('src/database/seed.ts', code);
