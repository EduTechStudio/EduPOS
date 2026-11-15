import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CartItem, CartTotals } from '@/services/pos/POSService';
import { CustomerEntity } from '@/database/types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency } from '@/utils/currency';
import { theme } from '@/theme';

interface CheckoutPrepModalProps {
  visible: boolean;
  cart: CartItem[];
  totals: CartTotals;
  customer: CustomerEntity | null;
  onClose: () => void;
}

export const CheckoutPrepModal: React.FC<CheckoutPrepModalProps> = ({
  visible,
  cart,
  totals,
  customer,
  onClose,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Persiapan Checkout</Text>
              <Text style={styles.headerSubtitle}>
                Pelanggan: {customer ? customer.name : 'Umum / Walk-in'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="check" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Phase 4 Notice */}
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Phase 4 Checkout Preparation Ready</Text>
              <Text style={styles.noticeText}>
                Pesanan telah divalidasi dan dihitung secara akurat. Modul kasir siap melanjutkan ke pencatatan transaksi dan gateway pembayaran (Tunai, QRIS, Struk) pada Phase 5.
              </Text>
            </View>

            {/* Order Items Breakdown */}
            <Text style={styles.sectionTitle}>Rincian Pesanan ({totals.totalItemCount} Item)</Text>
            <View style={styles.itemsList}>
              {cart.map((item) => (
                <View key={item.productId} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
                </View>
              ))}
            </View>

            {/* Summary Card */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totals.subtotal)}</Text>
              </View>

              {totals.discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Diskon Order</Text>
                  <Text style={styles.discountValue}>- {formatCurrency(totals.discountAmount)}</Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL BAYAR</Text>
                <Text style={styles.totalValue}>{formatCurrency(totals.grandTotal)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button title="Kembali Ke Kasir" variant="outline" size="sm" onPress={onClose} />
            <Button
              title="Lanjutkan Pembayaran (Phase 5)"
              variant="success"
              size="sm"
              onPress={onClose}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
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
    padding: theme.spacing.lg,
  },
  noticeCard: {
    backgroundColor: theme.colors.infoLight,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
  },
  noticeTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.info,
    marginBottom: 4,
  },
  noticeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  itemsList: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  itemName: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  itemSubtotal: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  summaryBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
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
  discountValue: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.success,
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
