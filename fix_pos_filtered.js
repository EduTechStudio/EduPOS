const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');
code = code.replace("data={filteredProducts}", "data={products}");
fs.writeFileSync('src/app/pos.tsx', code);
