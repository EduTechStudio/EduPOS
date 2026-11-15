const fs = require('fs');
let content = fs.readFileSync('src/config/defaultReceiptConfig.ts', 'utf-8');

if (!content.includes('showStoreAddress:')) {
  content = content.replace('showHeader: true,', 'showHeader: true,\n  showStoreAddress: true,\n  showStorePhone: true,\n  showLogo: true,');
  fs.writeFileSync('src/config/defaultReceiptConfig.ts', content);
}
