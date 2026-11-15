const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');

code = code.replace(
  "{isTablet ? (",
  "{isTablet && ("
);

fs.writeFileSync('src/app/pos.tsx', code);
