const fs = require('fs');
let content = fs.readFileSync('src/components/pos/PhoneCartSheet.tsx', 'utf-8');

// Add onHoldSale and onOpenDrafts props
content = content.replace(
  "onClearCart: () => void;",
  "onClearCart: () => void;\n  onHoldSale?: () => void;\n  onOpenDrafts?: () => void;"
);

content = content.replace(
  "onClearCart,",
  "onClearCart,\n  onHoldSale,\n  onOpenDrafts,"
);

// Replace footer
const oldFooter = `<View style={styles.footer}>
              <Button title="Kosongkan" variant="outline" size="sm" onPress={onClearCart} />
              <Button
                title={\`Bayar \${formatCurrency(totals.grandTotal)} ›\`}
                variant="success"
                size="md"
                style={{ flex: 1 }}
                onPress={onCheckout}
              />
            </View>`;

const newFooter = `<View style={styles.footer}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, width: '100%' }}>
                <Button title="Kosongkan" variant="danger" size="sm" onPress={onClearCart} style={{ flex: 1 }} />
                {onHoldSale && <Button title="Simpan Draft" variant="secondary" size="sm" onPress={onHoldSale} style={{ flex: 1 }} />}
              </View>
              <Button
                title={\`Bayar \${formatCurrency(totals.grandTotal)} ›\`}
                variant="success"
                size="lg"
                style={{ width: '100%' }}
                onPress={onCheckout}
              />
            </View>`;

content = content.replace(oldFooter, newFooter);

// Adjust footer styles
content = content.replace(
  /footer: \{\s*flexDirection: 'row',\s*gap: theme\.spacing\.sm,\s*padding: theme\.spacing\.lg,\s*borderTopWidth: 1,\s*borderTopColor: theme\.colors\.border,\s*\}/,
  `footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  }`
);

fs.writeFileSync('src/components/pos/PhoneCartSheet.tsx', content);
