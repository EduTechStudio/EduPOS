const fs = require('fs');
let content = fs.readFileSync('src/database/migrations.ts', 'utf-8');
content = content.replace("import { migration003 } from './migrations/003_draft_sales';", "import { migration003 } from './migrations/003_draft_sales';\nimport { migration004 } from './migrations/004_draft_sales_upgrade';");
content = content.replace("const MIGRATIONS: Migration[] = [migration001, migration002, migration003];", "const MIGRATIONS: Migration[] = [migration001, migration002, migration003, migration004];");
fs.writeFileSync('src/database/migrations.ts', content);
