const fs = require('fs');
let code = fs.readFileSync('src/database/seed.ts', 'utf-8');

// I will just leave it since the bug is fixed. But let's add try catch for seed.
code = code.replace(
  "export async function seedDatabase(db: SQLiteDatabase): Promise<void> {",
  "export async function seedDatabase(db: SQLiteDatabase): Promise<void> {\n  try {"
);
code = code.replace(
  "  console.log('[Database] Seed data verified and applied safely.');\n}",
  "  console.log('[Database] Seed data verified and applied safely.');\n  } catch (e: any) {\n    console.error('[Database] SEED FAILED:', e);\n    throw e;\n  }\n}"
);

fs.writeFileSync('src/database/seed.ts', code);
