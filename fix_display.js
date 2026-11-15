const fs = require('fs');

const files = [
  'src/app/transactions.tsx',
  'src/components/transaction/TransactionDetailModal.tsx',
  'src/services/transaction/TransactionService.ts',
  'src/services/receipt/ReceiptService.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace(/tx\.cashier_id === 'user_cashier' \? 'Primary Cashier' : tx\.cashier_id \|\| 'System'/g, "tx.cashier_id || 'System'");
    content = content.replace(/tx\.cashier_id === 'user_cashier' \? 'Primary Cashier' : tx\.cashier_id/g, "tx.cashier_id");
    content = content.replace(/detail\.transaction\.cashier_id === 'user_cashier' \? 'Primary Cashier' : detail\.transaction\.cashier_id \|\| 'System'/g, "detail.transaction.cashier_id || 'System'");
    fs.writeFileSync(file, content);
  }
}
