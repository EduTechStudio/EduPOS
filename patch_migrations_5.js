const fs = require('fs');
let content = fs.readFileSync('src/database/migrations.ts', 'utf-8');
content = content.replace("import { migration004 } from './migrations/004_draft_sales_upgrade';", "import { migration004 } from './migrations/004_draft_sales_upgrade';\nimport { migration005 } from './migrations/005_rbac_seed';");
content = content.replace("const MIGRATIONS: Migration[] = [migration001, migration002, migration003, migration004];", "const MIGRATIONS: Migration[] = [migration001, migration002, migration003, migration004, migration005];");
fs.writeFileSync('src/database/migrations.ts', content);
