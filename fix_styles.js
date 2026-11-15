const fs = require('fs');
let content = fs.readFileSync('src/components/pos/CheckoutModal.tsx', 'utf-8');

content = content.replace("style={styles.fieldContainer}", "style={{ marginBottom: theme.spacing.lg }}");
content = content.replace("style={styles.fieldLabel}", "style={{ ...theme.typography.bodySmall, fontWeight: 'bold', color: theme.colors.textSecondary, marginBottom: theme.spacing.xs }}");
content = content.replace("<Text style={{ marginLeft: 6, ...theme.typography.bodyMedium, color: theme.colors.textPrimary, fontWeight: 'bold' }}>", "<Text style={{ marginLeft: 6, ...theme.typography.bodyMedium, color: theme.colors.textPrimary, fontWeight: 'bold', flex: 1 }}>");

fs.writeFileSync('src/components/pos/CheckoutModal.tsx', content);
