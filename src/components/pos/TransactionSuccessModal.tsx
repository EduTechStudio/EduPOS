import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CheckoutResult } from '@/services/checkout/CheckoutService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { formatCurrency } from '@/utils/currency';
import { theme, useTheme } from '@/theme';
import { PrinterManager } from '@/services/printer/PrinterManager';
import { ReceiptPreviewModal } from '../receipt/ReceiptPreviewModal';

interface TransactionSuccessModalProps {
  visible: boolean;
  result: CheckoutResult | null;
  onFinish: () => void;
}

export const TransactionSuccessModal: React.FC<TransactionSuccessModalProps> = ({
  visible,
  result,
  onFinish,
}) => {
  const { colors, isDark } = useTheme();
  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [shouldAutoPrint, setShouldAutoPrint] = React.useState(false);
  const lastHandledTxIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (visible && result?.receiptData) {
      const currentTxId = result.transaction.id;
      if (lastHandledTxIdRef.current !== currentTxId) {
        lastHandledTxIdRef.current = currentTxId;

        // Check user's saved printer configuration for auto-print
        PrinterManager.getSavedConfig()
          .then((cfg) => {
            setShouldAutoPrint(Boolean(cfg.autoPrint));
            // Step 7: Open receipt preview immediately upon checkout success
            setPreviewVisible(true);
          })
          .catch(() => {
            setShouldAutoPrint(false);
            setPreviewVisible(true);
          });
      }
    } else if (!visible) {
      setPreviewVisible(false);
      setShouldAutoPrint(false);
    }
  }, [visible, result]);

  if (!result) return null;

  const { transaction, payment, items, receiptData } = result;

  return (
    <>
    <Modal visible={visible && !previewVisible} animationType="slide" transparent={true} onRequestClose={onFinish}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: colors.successSoft }]}>
              <Icon name="check" size={24} color={colors.success} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Transaksi Berhasil!</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{transaction.transaction_number}</Text>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Transaction Receipt Card */}
            <View style={[styles.receiptCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Waktu Transaksi</Text>
                <Text style={styles.receiptValue}>
                  {receiptData.transaction.date} {receiptData.transaction.time}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Kasir</Text>
                <Text style={styles.receiptValue}>{receiptData.transaction.cashierName}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Pelanggan</Text>
                <Text style={styles.receiptValue}>
                  {receiptData.transaction.customerName || 'Umum / Walk-in'}
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Items List */}
              {items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.product_name_snapshot}</Text>
                    <Text style={styles.itemQty}>
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Subtotal</Text>
                <Text style={styles.receiptValue}>{formatCurrency(transaction.subtotal)}</Text>
              </View>

              {transaction.discount_amount > 0 && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Diskon Order</Text>
                  <Text style={styles.discountValue}>- {formatCurrency(transaction.discount_amount)}</Text>
                </View>
              )}

              <View style={[styles.receiptRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL BAYAR</Text>
                <Text style={styles.totalValue}>{formatCurrency(transaction.total_amount)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Metode Pembayaran</Text>
                <Badge label={payment.payment_method.toUpperCase()} variant="info" />
              </View>

              {payment.payment_method === 'cash' ? (
                <>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Uang Diterima</Text>
                    <Text style={styles.receiptValue}>{formatCurrency(payment.received_amount)}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Kembalian</Text>
                    <Text style={styles.changeValue}>{formatCurrency(payment.change_amount)}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Kode Referensi</Text>
                  <Text style={styles.receiptValue}>{payment.reference_number || '-'}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              title="Lihat / Cetak Struk"
              variant="outline"
              size="sm"
              onPress={() => setPreviewVisible(true)}
            />
            <Button
              title="Selesai / Transaksi Baru ›"
              variant="accent"
              size="md"
              style={{ flex: 1 }}
              onPress={onFinish}
            />
          </View>
        </View>
      </View>
    </Modal>

    <ReceiptPreviewModal 
      visible={previewVisible}
      receiptData={receiptData}
      onClose={() => setPreviewVisible(false)}
      autoPrintOnMount={shouldAutoPrint}
    />
    </>
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
    maxWidth: 520,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  body: {
    padding: theme.spacing.lg,
  },
  receiptCard: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  receiptLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  receiptValue: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  discountValue: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.success,
  },
  changeValue: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: theme.colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  itemName: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  itemQty: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  itemSubtotal: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.textPrimary,
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
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
