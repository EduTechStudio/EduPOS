const fs = require('fs');
let pos = fs.readFileSync('src/app/pos.tsx', 'utf-8');

pos = pos.replace(
  "onClearCart={handleClearCart}",
  "onClearCart={handleClearCart}\n          onHoldSale={handleHoldSale}\n          onOpenDrafts={() => setIsDraftsModalOpen(true)}"
);

fs.writeFileSync('src/app/pos.tsx', pos);
