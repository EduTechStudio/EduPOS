import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CartItem, CartTotals, DiscountState } from '@/services/pos/POSService';
import { CustomerEntity } from '@/database/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { CartQuantityInput } from './CartQuantityInput';
import { formatCurrency } from '@/utils/currency';
import { formatQuantity } from '@/utils/quantity';
import { theme, useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PhoneCartSheetProps {
  visible: boolean;
  cart: CartItem[];
  totals: CartTotals;
  discount: DiscountState;
  customer: CustomerEntity | null;
  onClose: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSetQuantity?: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onOpenDiscount: () => void;
  onClearCart: () => void;
  onHoldSale?: () => void;
  onOpenDrafts?: () => void;
  onCheckout: () => void;
}

export const PhoneCartSheet: React.FC<PhoneCartSheetProps> = ({
  visible,
  cart,
  totals,
  discount,
  customer,
  onClose,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onOpenDiscount,
  onClearCart,
  onHoldSale,
  onOpenDrafts,
  onCheckout,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Keranjang Belanja</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {totals.totalItemCount} item di keranjang
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: theme.spacing.md }} showsVerticalScrollIndicator={false}>
            {cart.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="pos" size={44} color={colors.textMuted} style={{ marginBottom: theme.spacing.md }} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Keranjang Masih Kosong</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Pilih produk dari katalog untuk mulai menambahkan ke keranjang belanja kasir.</Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {cart.map((item) => (
                  <View key={item.productId} style={[styles.cartItemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
                      <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>{item.productName}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginVertical: 2 }}>
                        <Text style={[styles.itemPrice, { color: colors.textSecondary }]}>
                          {formatCurrency(item.unitPrice)} / {item.unit || 'pcs'}
                        </Text>
                        {item.activeTier ? (
                          <Badge label="Grosir" variant="accent" />
                        ) : null}
                      </View>
                      <Text style={[styles.itemSubtotal, { color: colors.primary }]}>
                        Total: {formatCurrency(item.subtotal)}
                      </Text>
                    </View>

                    {/* Quantity controls */}
                    <View style={styles.qtyControlRow}>
                      <CartQuantityInput
                        quantity={item.quantity}
                        unit={item.unit}
                        isStockTracked={item.stockTracking !== false}
                        availableStock={item.availableStock}
                        onCommitQuantity={(newQty) =>
                          onSetQuantity
                            ? onSetQuantity(item.productId, newQty)
                            : onUpdateQuantity(item.productId, newQty - item.quantity)
                        }
                        onIncrement={() => onUpdateQuantity(item.productId, 1)}
                        onDecrement={() => onUpdateQuantity(item.productId, -1)}
                      />
                      <TouchableOpacity
                        onPress={() => onRemoveItem(item.productId)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        accessibilityLabel="Hapus item"
                        style={[styles.removeBtn, { backgroundColor: colors.errorSoft }]}>
                        <Icon name="close" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {cart.length > 0 && (
              <View style={[styles.summaryBox, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatCurrency(totals.subtotal)}</Text>
                </View>

                <TouchableOpacity onPress={onOpenDiscount} style={styles.discountRowTrigger}>
                  <Text style={[styles.discountTriggerLabel, { color: colors.accent }]}>
                    Diskon {discount.calculatedAmount > 0 ? `(${discount.type === 'PERCENT' ? `${discount.value}%` : 'Nominal'})` : ''}:
                  </Text>
                  <Text style={[styles.discountTriggerValue, { color: colors.success }]}>
                    {discount.calculatedAmount > 0 ? `- ${formatCurrency(discount.calculatedAmount)}` : '+ Tambah Diskon'}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>TOTAL</Text>
                  <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(totals.grandTotal)}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {cart.length > 0 && (
            <View
              style={[
                styles.footer,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.surface,
                  paddingBottom: Math.max(insets.bottom, theme.spacing.md),
                },
              ]}
            >
              {/* Row 1: Simpan Produk | Kosongkan */}
              <View style={styles.actionRow1}>
                {onHoldSale ? (
                  <Button
                    title="Simpan Produk"
                    variant="secondary"
                    size="md"
                    onPress={onHoldSale}
                    style={styles.actionBtnHalf}
                    textStyle={styles.actionBtnTextSm}
                  />
                ) : null}
                <Button
                  title="Kosongkan"
                  variant="danger"
                  size="md"
                  onPress={onClearCart}
                  style={onHoldSale ? styles.actionBtnHalf : styles.actionBtnFull}
                  textStyle={styles.actionBtnTextSm}
                />
              </View>

              {/* Row 2: Transaksi Tersimpan */}
              {onOpenDrafts ? (
                <View style={styles.actionRow2}>
                  <Button
                    title="Transaksi Tersimpan"
                    variant="outline"
                    size="md"
                    fullWidth
                    onPress={onOpenDrafts}
                    style={styles.actionBtnFull}
                    textStyle={styles.actionBtnTextSm}
                  />
                </View>
              ) : null}

              {/* Row 3: Bayar */}
              <View style={styles.actionRow3}>
                <Button
                  title={`Bayar ${formatCurrency(totals.grandTotal)} ›`}
                  variant="success"
                  size="lg"
                  fullWidth
                  onPress={onCheckout}
                  style={styles.actionBtnPay}
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  body: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  emptyBox: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  itemsList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
  },
  itemName: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  itemPrice: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  itemSubtotal: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 2,
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: theme.colors.textMuted,
  },
  qtyBtnText: {
    ...theme.typography.header3,
    fontSize: 16,
    color: theme.colors.textInverse,
    lineHeight: 18,
  },
  qtyText: {
    ...theme.typography.header3,
    fontSize: 14,
    color: theme.colors.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  removeBtnText: {
    ...theme.typography.bodySmall,
    color: theme.colors.error,
    fontWeight: '700',
  },
  summaryBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  summaryLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  discountRowTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  discountTriggerLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  discountTriggerValue: {
    ...theme.typography.bodySmall,
    color: theme.colors.success,
    fontWeight: '700',
  },
  totalRow: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    ...theme.typography.priceLarge,
    color: theme.colors.primary,
  },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionRow1: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    width: '100%',
  },
  actionBtnHalf: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: theme.spacing.xs,
  },
  actionBtnFull: {
    width: '100%',
    minHeight: 40,
    paddingHorizontal: theme.spacing.xs,
  },
  actionBtnTextSm: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow2: {
    marginBottom: theme.spacing.xs,
    width: '100%',
  },
  actionRow3: {
    width: '100%',
  },
  actionBtnPay: {
    minHeight: 48,
  },
});
