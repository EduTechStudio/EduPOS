const fs = require('fs');
let file = fs.readFileSync('src/app/settings/system-configuration/database-maintenance.tsx', 'utf-8');
file = file.replace(
  "const tables = ['transaction_items',",
  "const tables = ['draft_sale_items', 'draft_sales', 'transaction_items',"
);
fs.writeFileSync('src/app/settings/system-configuration/database-maintenance.tsx', file);
