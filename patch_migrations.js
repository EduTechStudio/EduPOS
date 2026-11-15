const fs = require('fs');
let code = fs.readFileSync('src/database/migrations.ts', 'utf-8');
code = code.replace(
  "import { migration005 } from './migrations/005_rbac_seed';",
  "import { migration005 } from './migrations/005_rbac_seed';\nimport { migration006 } from './migrations/006_user_permissions';"
);
code = code.replace(
  "const MIGRATIONS: Migration[] = [migration001, migration002, migration003, migration004, migration005];",
  "const MIGRATIONS: Migration[] = [migration001, migration002, migration003, migration004, migration005, migration006];"
);
fs.writeFileSync('src/database/migrations.ts', code);
