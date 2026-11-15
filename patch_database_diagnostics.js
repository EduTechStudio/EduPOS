const fs = require('fs');
let code = fs.readFileSync('src/database/database.ts', 'utf-8');

const diagnostics = `
      // RUN DIAGNOSTICS
      console.log('--- DB DIAGNOSTICS BEFORE MIGRATIONS ---');
      const fkCheck = await db.getAllAsync('PRAGMA foreign_key_check;');
      console.log('FK Check:', fkCheck);
      
      const tables = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table';");
      console.log('Tables:', tables);

      if (tables.some(t => t.name === 'users')) {
        const orphanUsers = await db.getAllAsync("SELECT u.id, u.role_id FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE r.id IS NULL;");
        console.log('Orphan Users:', orphanUsers);
      }
      
      if (tables.some(t => t.name === 'role_permissions')) {
        const orphanRP = await db.getAllAsync("SELECT rp.* FROM role_permissions rp LEFT JOIN roles r ON r.id = rp.role_id LEFT JOIN permissions p ON p.id = rp.permission_id WHERE r.id IS NULL OR p.id IS NULL;");
        console.log('Orphan Role Permissions:', orphanRP);
      }
      console.log('-----------------------------------------');
`;

code = code.replace(
  "      await runMigrations(db);",
  diagnostics + "\n      await runMigrations(db);"
);

fs.writeFileSync('src/database/database.ts', code);
