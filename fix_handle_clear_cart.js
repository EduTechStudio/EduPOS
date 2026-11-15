const fs = require('fs');
let pos = fs.readFileSync('src/app/pos.tsx', 'utf-8');

pos = pos.replace(
  `onPress: () => {
            setCart([]);
            setDiscount({ type: 'FIXED', value: 0, calculatedAmount: 0 });`,
  `onPress: () => {
            clearCart();`
);

fs.writeFileSync('src/app/pos.tsx', pos);
