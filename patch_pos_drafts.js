const fs = require('fs');
let content = fs.readFileSync('src/app/pos.tsx', 'utf-8');

// Imports
content = content.replace(
  "import { posService, categoryService } from '@/services';",
  "import { posService, categoryService } from '@/services';\nimport { draftService, DraftSaleWithItems } from '@/services/pos/DraftService';"
);
content = content.replace("import { CustomerSelectorModal } from '@/components/pos/CustomerSelectorModal';", "import { CustomerSelectorModal } from '@/components/pos/CustomerSelectorModal';\nimport { DraftListModal } from '@/components/pos/DraftListModal';");

// States
content = content.replace(
  "const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);",
  "const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);\n  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState<boolean>(false);"
);

// Hold Sale Logic
const holdSaleLogic = `
  const handleHoldSale = async () => {
    if (cart.length === 0) return;
    try {
      await draftService.saveDraft(cart, selectedCustomer, totals);
      clearCart();
      Alert.alert('Sukses', 'Transaksi berhasil disimpan sebagai draft.');
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Gagal menyimpan draft');
    }
  };

  const handleResumeDraft = async (draft: DraftSaleWithItems) => {
    // Basic conversion logic
    const newCart = draft.items.map(item => ({
      productId: item.product_id,
      productName: item.product_name_snapshot,
      sku: item.sku_snapshot || '',
      barcode: null,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      subtotal: item.subtotal,
      availableStock: 9999, // Will be validated by POSService before checkout
      unit: 'pcs'
    }));
    setCart(newCart);
    setDiscount({ type: 'FIXED', value: draft.discount_amount, calculatedAmount: draft.discount_amount });
    if (draft.customer_id) {
      const c = customers.find(x => x.id === draft.customer_id);
      setSelectedCustomer(c || null);
    } else {
      setSelectedCustomer(null);
    }
    
    // Attempt to cancel the draft in DB so it moves from Draft to Current Cart
    try {
      await draftService.cancelDraft(draft.id, { userId: 'cashier_resume' });
    } catch(e) {}
    
    setIsDraftsModalOpen(false);
  };
`;
content = content.replace("const handleStartCheckout = async () => {", holdSaleLogic + "\n  const handleStartCheckout = async () => {");

// Add button to header or tablet layout
content = content.replace(
  /<Button title="Kosongkan" variant="outline" size="sm" onPress=\{handleClearCart\} \/>/,
  `<Button title="Drafts" variant="outline" size="sm" onPress={() => setIsDraftsModalOpen(true)} style={{ marginRight: 8 }} />
                  <Button title="Hold" variant="secondary" size="sm" onPress={handleHoldSale} disabled={cart.length === 0} style={{ marginRight: 8 }} />
                  <Button title="Kosongkan" variant="outline" size="sm" onPress={handleClearCart} />`
);

// Add modal component
content = content.replace(
  /<CustomerSelectorModal visible=\{isCustomerModalOpen\}/,
  `<DraftListModal visible={isDraftsModalOpen} onResume={handleResumeDraft} onClose={() => setIsDraftsModalOpen(false)} />
      <CustomerSelectorModal visible={isCustomerModalOpen}`
);

fs.writeFileSync('src/app/pos.tsx', content);
