const fs = require('fs');
let content = fs.readFileSync('src/app/pos.tsx', 'utf-8');

content = content.replace("import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';", "import { BarcodeScannerModal } from '@/components/barcode/BarcodeScannerModal';\nimport { CustomerSelectorModal } from '@/components/pos/CustomerSelectorModal';");

// Remove the automatic default customer assignment which forces it.
content = content.replace("        if (!selectedCustomer && custsData.length > 0) {\n          setSelectedCustomer(custsData[0]); // Default to Walk-in customer\n        }", "        // Customer is strictly optional now.");

// Add state for CustomerSelectorModal
content = content.replace("const [isScannerOpen, setIsScannerOpen] = useState(false);", "const [isScannerOpen, setIsScannerOpen] = useState(false);\n  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);");

// Replace the subtext in the tablet cart with a button:
const customerButtonTablet = `
                    <TouchableOpacity onPress={() => setIsCustomerModalOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={[styles.customerSubtext, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                        Pelanggan: {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum'} ▼
                      </Text>
                      {selectedCustomer && (
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setSelectedCustomer(null); }} style={{ marginLeft: 8 }}>
                          <Text style={{ fontSize: 12, color: theme.colors.error }}>✕ Clear</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
`;
content = content.replace(/<Text style=\{styles\.customerSubtext\}>\s*Pelanggan: \{selectedCustomer \? selectedCustomer\.name : 'Umum \/ Walk-in'\}\s*<\/Text>/g, customerButtonTablet);

// In the phone layout, there's another place, wait let's just grep "Pelanggan:" to see where else.
// It might just be in the cart. Let's add the modal to the bottom.
content = content.replace("</ScreenContainer>", "  <CustomerSelectorModal visible={isCustomerModalOpen} customers={customers} selectedCustomer={selectedCustomer} onSelect={setSelectedCustomer} onClose={() => setIsCustomerModalOpen(false)} />\n    </ScreenContainer>");

fs.writeFileSync('src/app/pos.tsx', content);
