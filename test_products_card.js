const fs = require('fs');
let code = fs.readFileSync('src/app/products.tsx', 'utf-8');

code = code.replace(
  "{prod.name}",
  "{prod.name} STOCK UI TEST"
);

fs.writeFileSync('src/app/products.tsx', code);
