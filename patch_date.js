const fs = require('fs');

// Patch ReportService
let rep = fs.readFileSync('src/services/report/ReportService.ts', 'utf-8');
rep = rep.replace(/private getDateBounds[\s\S]*?return \{\}; \/\/ 'all'\n  \}\n/m, '');
rep = rep.replace(/this\.getDateBounds/g, 'getDateBounds');
// Add imports
rep = rep.replace("import { getDatabase } from '@/database';", "import { getDatabase } from '@/database';\nimport { DateRangePreset, getDateBounds } from '@/utils/dateRange';");
fs.writeFileSync('src/services/report/ReportService.ts', rep);

// Patch TransactionService
let tx = fs.readFileSync('src/services/transaction/TransactionService.ts', 'utf-8');
tx = tx.replace(/export type DateRangePreset = 'today' \| 'yesterday' \| 'week' \| 'month' \| 'all' \| 'custom';/g, '');
tx = tx.replace(/private getDateBounds[\s\S]*?return \{\};\n  \}\n/m, '');
tx = tx.replace(/this\.getDateBounds/g, 'getDateBounds');
// Add imports
tx = tx.replace("import { getDatabase } from '@/database';", "import { getDatabase } from '@/database';\nimport { DateRangePreset, getDateBounds } from '@/utils/dateRange';");
fs.writeFileSync('src/services/transaction/TransactionService.ts', tx);

// Patch reports.tsx imports
let uiRep = fs.readFileSync('src/app/reports.tsx', 'utf-8');
uiRep = uiRep.replace("import { DateRangePreset } from '@/services/transaction/TransactionService';", "import { DateRangePreset } from '@/utils/dateRange';");
fs.writeFileSync('src/app/reports.tsx', uiRep);

