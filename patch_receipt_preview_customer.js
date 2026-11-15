const fs = require('fs');
let content = fs.readFileSync('src/components/receipt/ReceiptPreview.tsx', 'utf-8');

const newStr = "{(receiptData.config.showCustomer && receiptData.transaction.customerName) ? <Text style={styles.infoText}>Pelanggan: {receiptData.transaction.customerName}</Text> : null}";

content = content.replace(
  /\{receiptData\.config\.showCustomer && \(\s*<Text style=\{styles\.infoText\}>Pelanggan: \{receiptData\.transaction\.customerName\}<\/Text>\s*\)\}/,
  newStr
);
fs.writeFileSync('src/components/receipt/ReceiptPreview.tsx', content);
