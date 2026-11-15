const fs = require('fs');
let code = fs.readFileSync('src/database/database.ts', 'utf-8');

code = code.replace(
  "const tables = await db.getAllAsync(\"SELECT name FROM sqlite_master WHERE type='table';\");",
  "const tables = await db.getAllAsync<{name: string}>(\"SELECT name FROM sqlite_master WHERE type='table';\");"
);

fs.writeFileSync('src/database/database.ts', code);
