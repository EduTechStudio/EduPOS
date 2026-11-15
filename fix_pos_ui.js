const fs = require('fs');
let pos = fs.readFileSync('src/app/pos.tsx', 'utf-8');

// Fix handleHoldSale
pos = pos.replace(
  "await draftService.saveDraft(cart, selectedCustomer, totals);",
  "await draftService.saveDraft(cart, selectedCustomer, { type: discount.type, value: discount.value }, totals);"
);

// Fix handleResumeDraft
pos = pos.replace(
  "setDiscount({ type: 'FIXED', value: draft.discount_amount, calculatedAmount: draft.discount_amount });",
  "setDiscount({ type: draft.discount_type || 'FIXED', value: draft.discount_value || 0, calculatedAmount: draft.discount_amount });"
);
pos = pos.replace(
  "await draftService.cancelDraft(draft.id, { userId: 'cashier_resume' });",
  "await draftService.resumeDraft(draft.id);"
);

// Add confirmation to resume if cart has items
const resumeLogic = `
  const handleResumeDraft = async (draft: DraftSaleWithItems) => {
    const doResume = async () => {
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
      setDiscount({ type: draft.discount_type || 'FIXED', value: draft.discount_value || 0, calculatedAmount: draft.discount_amount });
      if (draft.customer_id) {
        const c = customers.find(x => x.id === draft.customer_id);
        setSelectedCustomer(c || null);
      } else {
        setSelectedCustomer(null);
      }
      
      try {
        await draftService.resumeDraft(draft.id);
      } catch(e) {}
      
      setIsDraftsModalOpen(false);
    };

    if (cart.length > 0) {
      Alert.alert(
        'Keranjang saat ini masih berisi transaksi.',
        'Lanjutkan Draft akan mengganti keranjang saat ini. Lanjutkan?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Lanjutkan', onPress: doResume }
        ]
      );
    } else {
      doResume();
    }
  };
`;
// Replace the old handleResumeDraft entirely.
pos = pos.replace(/const handleResumeDraft = async \(draft: DraftSaleWithItems\) => \{[\s\S]*?setIsDraftsModalOpen\(false\);\n  \};/m, resumeLogic);


// Replace the checkout Actions block
const oldCheckoutActions = `<View style={styles.checkoutActions}>
                  <Button
                    title="Kosongkan Keranjang"
                    variant="outline"
                    size="sm"
                    disabled={cart.length === 0}
                    onPress={handleClearCart}
                  />
                  <Button
                    title={\`Bayar \${formatCurrency(totals.grandTotal)} ›\`}
                    variant="success"
                    size="lg"
                    fullWidth
                    disabled={cart.length === 0}
                    onPress={handleStartCheckout}
                  />
                </View>`;

const newCheckoutActions = `<View style={styles.checkoutActions}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Button
                      title="Transaksi Tersimpan"
                      variant="outline"
                      size="sm"
                      onPress={() => setIsDraftsModalOpen(true)}
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button
                      title="Simpan Draft"
                      variant="secondary"
                      size="sm"
                      disabled={cart.length === 0}
                      onPress={handleHoldSale}
                      style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button
                      title="Kosongkan"
                      variant="danger"
                      size="sm"
                      disabled={cart.length === 0}
                      onPress={handleClearCart}
                    />
                  </View>
                  <Button
                    title={\`Bayar \${formatCurrency(totals.grandTotal)} ›\`}
                    variant="success"
                    size="lg"
                    fullWidth
                    disabled={cart.length === 0}
                    onPress={handleStartCheckout}
                  />
                </View>`;

pos = pos.replace(oldCheckoutActions, newCheckoutActions);

fs.writeFileSync('src/app/pos.tsx', pos);
