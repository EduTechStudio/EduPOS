const fs = require('fs');
let code = fs.readFileSync('src/app/products.tsx', 'utf-8');

code = code.replace(
  /<Button\s+title="Atur Stok"[\s\S]*?onPress=\{\(\) => handleOpenStockAdjust\(prod\)\}\s+\/>/g,
  "{hasPermission('product.stock_adjust') && $&}"
);

code = code.replace(
  /<Button\s+title="Edit"[\s\S]*?onPress=\{\(\) => handleOpenEditProduct\(prod\)\}\s+\/>/g,
  "{hasPermission('product.edit') && $&}"
);

fs.writeFileSync('src/app/products.tsx', code);
