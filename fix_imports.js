const fs = require('fs');

// Fix ReportService.ts
let rep = fs.readFileSync('src/services/report/ReportService.ts', 'utf-8');
rep = rep.replace("import { DateRangePreset } from '../transaction/TransactionService';", "import { DateRangePreset, getDateBounds } from '@/utils/dateRange';");
fs.writeFileSync('src/services/report/ReportService.ts', rep);

// Fix TransactionService.ts
let tx = fs.readFileSync('src/services/transaction/TransactionService.ts', 'utf-8');
tx = tx.replace(/import\s*\{\s*transactionRepository,/m, "import { DateRangePreset, getDateBounds } from '@/utils/dateRange';\nimport {\n  transactionRepository,");
fs.writeFileSync('src/services/transaction/TransactionService.ts', tx);

// Fix transactions.tsx
let txui = fs.readFileSync('src/app/transactions.tsx', 'utf-8');
txui = txui.replace("DateRangePreset,", "");
txui = txui.replace("import { formatCurrency", "import { DateRangePreset } from '@/utils/dateRange';\nimport { formatCurrency");
fs.writeFileSync('src/app/transactions.tsx', txui);

