const fs = require('fs');
let content = fs.readFileSync('src/types/receipt.ts', 'utf-8');

if (!content.includes('showStoreAddress')) {
  content = content.replace('showHeader: boolean;', 'showHeader: boolean;\n  showStoreAddress?: boolean;\n  showStorePhone?: boolean;\n  showLogo?: boolean;');
  fs.writeFileSync('src/types/receipt.ts', content);
}
