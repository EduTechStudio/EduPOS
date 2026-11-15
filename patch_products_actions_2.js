const fs = require('fs');
let code = fs.readFileSync('src/app/products.tsx', 'utf-8');

code = code.replace(
  /<Button\s+title="[^"]+"\s+variant="outline"\s+size="sm"\s+onPress=\{\(\) => handleOpenStockAdjust\(prod\)\}\s+\/>/g,
  "{hasPermission('product.stock_adjust') && $&}"
);

fs.writeFileSync('src/app/products.tsx', code);
