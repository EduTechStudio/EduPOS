const fs = require('fs');
let code = fs.readFileSync('src/app/pos.tsx', 'utf-8');

const targetBlock = `      if (prodsResult.status === 'fulfilled') {
        setProducts(prodsResult.value);
      } else {`;

const newBlock = `      if (prodsResult.status === 'fulfilled') {
        setProducts(prodsResult.value);
        if (prodsResult.value.length > 0) console.log("[POS DEBUG] first product =", prodsResult.value[0]);
      } else {`;

if (code.includes(targetBlock)) {
    code = code.replace(targetBlock, newBlock);
    fs.writeFileSync('src/app/pos.tsx', code);
    console.log("Patched pos.tsx debug log 2 successfully.");
} else {
    console.error("Target block not found in pos.tsx!");
}
