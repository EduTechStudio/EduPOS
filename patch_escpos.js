const fs = require('fs');
let content = fs.readFileSync('src/services/printer/EscPosEncoder.ts', 'utf-8');

const updatedEncodeReceipt = `
  public encodeReceipt(data: ReceiptData): number[] {
    const { store, transaction, items, payments, config } = data;
    
    this.initialize();
    
    if (config.showHeader) {
      this.setAlign('center');
      this.setBold(true);
      this.textLine(store.name);
      this.setBold(false);
      
      if (config.showStoreAddress !== false && store.address) {
        this.textLine(store.address);
      }
      if (config.showStorePhone !== false && store.phone) {
        this.textLine(\`Tel: \${store.phone}\`);
      }
      this.newline();
    }

    this.setAlign('left');
    if (config.showTransactionNumber) this.row('No:', transaction.transactionNumber);
    if (config.showCashier) this.row('Kasir:', transaction.cashierName);
    if (config.showDateTime) this.row('Waktu:', \`\${transaction.date} \${transaction.time}\`);
    if (config.showCustomer && transaction.customerName) {
      this.row('Pelanggan:', transaction.customerName);
    }
    
    this.separator();

    items.forEach(item => {
      this.textLine(item.name);
      const qtyStr = \`\${item.quantity}x @ \${formatCurrency(item.unitPrice)}\`;
      const totalStr = formatCurrency(item.subtotal);
      this.row(qtyStr, totalStr);
    });

    this.separator();
    
    if (config.showSubtotal) this.row('Subtotal', formatCurrency(transaction.subtotal));
    if (config.showDiscount && transaction.discount > 0) {
      this.row('Diskon', \`-\${formatCurrency(transaction.discount)}\`);
    }
    this.setBold(true);
    if (config.showTotal) this.row('Total', formatCurrency(transaction.total));
    this.setBold(false);
    
    this.newline();
    if (config.showPaymentMethod) {
      payments.forEach(p => {
        this.row('Metode', p.method);
        if (p.method === 'cash' || p.method === 'CASH') {
          this.row('Bayar', formatCurrency(p.receivedAmount));
          if (config.showChange) this.row('Kembali', formatCurrency(p.changeAmount));
        }
      });
    }

    if (config.showFooter && config.footerText) {
      this.newline();
      this.setAlign('center');
      this.textLine(config.footerText);
    }
    
    this.newline(2);
    this.cut();
    return this.buffer;
  }
`;

content = content.replace(/public encodeReceipt[\s\S]*return this\.buffer;\n  \}/, updatedEncodeReceipt.trim());
fs.writeFileSync('src/services/printer/EscPosEncoder.ts', content);
