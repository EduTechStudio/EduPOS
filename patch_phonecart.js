const fs = require('fs');
let content = fs.readFileSync('src/components/pos/PhoneCartSheet.tsx', 'utf-8');

content = content.replace(
  "{totals.totalItemCount} item • Pelanggan: {customer ? customer.name : 'Umum'}",
  "{totals.totalItemCount} item di keranjang"
);
fs.writeFileSync('src/components/pos/PhoneCartSheet.tsx', content);
