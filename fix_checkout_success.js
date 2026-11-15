const fs = require('fs');
let pos = fs.readFileSync('src/app/pos.tsx', 'utf-8');

pos = pos.replace(
  `// Clear cart ONLY after successful atomic SQLite commit
    setCart([]);
    setDiscount({ type: 'FIXED', value: 0, calculatedAmount: 0 });`,
  `// Clear cart ONLY after successful atomic SQLite commit
    clearCart();`
);

fs.writeFileSync('src/app/pos.tsx', pos);
