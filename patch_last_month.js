const fs = require('fs');

let dt = fs.readFileSync('src/utils/dateRange.ts', 'utf-8');
dt = dt.replace(" | 'custom';", " | 'last_month' | 'custom';");

const lmLogic = `
  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }

  if (preset === 'custom') {`;
dt = dt.replace("  if (preset === 'custom') {", lmLogic);
fs.writeFileSync('src/utils/dateRange.ts', dt);

let idx = fs.readFileSync('src/app/index.tsx', 'utf-8');
idx = idx.replace("{ label: 'This Month', value: 'month' },", "{ label: 'This Month', value: 'month' },\n      { label: 'Last Month', value: 'last_month' },");
fs.writeFileSync('src/app/index.tsx', idx);

