const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');
code = code.replace("styles.cartFooter", "{ padding: 16 }");
fs.writeFileSync('src/app/pos.tsx', code);
