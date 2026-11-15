const fs = require('fs');

// 1. Update ReceiptService.ts
let serviceContent = fs.readFileSync('src/services/receipt/ReceiptService.ts', 'utf-8');
serviceContent = serviceContent.replace('customerName: string;', 'customerName: string | null;');
serviceContent = serviceContent.replace("const customerName = detail.customer?.name || 'Walk-in Customer';", "const customerName = detail.customer?.name || null;");
fs.writeFileSync('src/services/receipt/ReceiptService.ts', serviceContent);

// 2. Update EscPosEncoder.ts
// In my previous step I did: `if (config.showCustomer && transaction.customerName) this.row('Pelanggan:', transaction.customerName);`
// This is already safe against null!

// 3. Update ReceiptPreview.tsx
let previewContent = fs.readFileSync('src/components/receipt/ReceiptPreview.tsx', 'utf-8');
// Currently it does: `{receiptData.config.showCustomer && (<Text style={styles.infoText}>Pelanggan: {receiptData.transaction.customerName}</Text>)}`
// I need to patch it to check for truthiness of customerName.
previewContent = previewContent.replace(
  "{receiptData.config.showCustomer && (\\n            <Text style={styles.infoText}>Pelanggan: {receiptData.transaction.customerName}</Text>\\n          )}",
  "{(receiptData.config.showCustomer && receiptData.transaction.customerName) ? <Text style={styles.infoText}>Pelanggan: {receiptData.transaction.customerName}</Text> : null}"
);
fs.writeFileSync('src/components/receipt/ReceiptPreview.tsx', previewContent);

