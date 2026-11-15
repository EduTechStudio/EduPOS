const fs = require('fs');
let content = fs.readFileSync('src/app/reports.tsx', 'utf-8');

// Replace the expense trend with something neutral like transaction count or discount
content = content.replace(
  /trend=\{summary\?\.totalExpenses \? `Pengeluaran: \$\{formatCurrency\(summary\.totalExpenses\)\}` : 'Sebelum Biaya Operasional'\}/g,
  "trend={`Diskon: ${formatCurrency(summary?.totalDiscount || 0)}`}"
);

fs.writeFileSync('src/app/reports.tsx', content);
