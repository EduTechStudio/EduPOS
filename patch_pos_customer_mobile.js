const fs = require('fs');
let content = fs.readFileSync('src/app/pos.tsx', 'utf-8');

const searchCode = `
            {/* Customer Selector (Visible on Phone always, or Tablet) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm }}>
              <TouchableOpacity 
                onPress={() => setIsCustomerModalOpen(true)} 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border }}
              >
                <Icon name="users" size={16} color={theme.colors.primary} />
                <Text style={{ marginLeft: 6, ...theme.typography.bodySmall, color: theme.colors.textPrimary, fontWeight: 'bold' }}>
                  {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'} ▼
                </Text>
              </TouchableOpacity>
              {selectedCustomer && (
                <TouchableOpacity onPress={() => setSelectedCustomer(null)} style={{ padding: 8 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: 'bold' }}>✕ Clear</Text>
                </TouchableOpacity>
              )}
            </View>
`;

content = content.replace("            <Input", searchCode + "\n            <Input");
fs.writeFileSync('src/app/pos.tsx', content);
