const fs = require('fs');
let content = fs.readFileSync('src/app/settings/receipt-printer.tsx', 'utf-8');

const footerCode = `
            {renderToggle('Show Customer', 'Display customer name', receiptConfig.showCustomer, 
              (v) => setReceiptConfig({...receiptConfig, showCustomer: v}))}

            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={{ ...theme.typography.bodyMedium, fontWeight: 'bold' }}>Receipt Footer</Text>
              <Text style={{ ...theme.typography.caption, color: theme.colors.textMuted, marginBottom: theme.spacing.xs }}>Text displayed at the bottom of the receipt.</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.sm, padding: theme.spacing.sm, height: 80, textAlignVertical: 'top' }}
                multiline
                placeholder="Terima kasih telah berbelanja"
                value={receiptConfig.footerText}
                onChangeText={(text) => setReceiptConfig({...receiptConfig, footerText: text, showFooter: text.trim().length > 0})}
              />
            </View>
`;

content = content.replace(
  "{renderToggle('Show Customer', 'Display customer name', receiptConfig.showCustomer, \n              (v) => setReceiptConfig({...receiptConfig, showCustomer: v}))}",
  footerCode
);

content = content.replace("import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';", "import { View, Text, StyleSheet, ScrollView, Switch, Alert, TextInput } from 'react-native';");

fs.writeFileSync('src/app/settings/receipt-printer.tsx', content);
