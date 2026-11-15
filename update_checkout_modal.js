const fs = require('fs');
let content = fs.readFileSync('src/components/pos/CheckoutModal.tsx', 'utf-8');

// 1. Update Props
content = content.replace(
  "customer: CustomerEntity | null;",
  "customer: CustomerEntity | null;\n  onOpenCustomerModal: () => void;\n  onClearCustomer: () => void;"
);

content = content.replace(
  "customer,",
  "customer,\n  onOpenCustomerModal,\n  onClearCustomer,"
);

// 2. Render the customer selector button
const customerSelectorButton = `
            {/* Customer Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Customer</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={onOpenCustomerModal}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.sm,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon name="customers" size={16} color={theme.colors.primary} />
                    <Text style={{ marginLeft: 6, ...theme.typography.bodyMedium, color: theme.colors.textPrimary, fontWeight: 'bold' }}>
                      {customer ? customer.name : 'Pelanggan Umum'}
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>▼</Text>
                </TouchableOpacity>
                {customer && (
                  <TouchableOpacity onPress={onClearCustomer} style={{ padding: theme.spacing.sm, marginLeft: theme.spacing.xs }}>
                    <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
`;

content = content.replace(
  "{/* Payment Method Selector */}",
  customerSelectorButton + "\n            {/* Payment Method Selector */}"
);

fs.writeFileSync('src/components/pos/CheckoutModal.tsx', content);
