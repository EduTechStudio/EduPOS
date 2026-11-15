const fs = require('fs');
let code = fs.readFileSync('src/app/products.tsx', 'utf-8');
code = code.replace("theme.typography.body}", "theme.typography.bodyMedium}");
fs.writeFileSync('src/app/products.tsx', code);
