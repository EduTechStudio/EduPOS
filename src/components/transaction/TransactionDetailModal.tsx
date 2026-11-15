import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TransactionDetail, transactionService } from '@/services/transaction/TransactionService';
import { formatCurrency } from '@/utils/currency';
import { theme, useTheme } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { receiptService, ReceiptData } from '@/services/receipt/ReceiptService';
import { ReceiptPreviewModal } from '../receipt/ReceiptPreviewModal';

interface TransactionDetailModalProps {
  visible: boolean;
  detail: TransactionDetail | null;
  onClose: () => void;
  onTransactionDeleted?: () => void;
}

export function TransactionDetailModal({ visible, detail, onClose, onTransactionDeleted }: TransactionDetailModalProps) {
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [receiptData, setReceiptData] = React.useState<ReceiptData | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!detail) return null;

  const { transaction: tx, customer, cashier, items, payments } = detail;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoStr;
    }
  };

  const getStatusBadgeInfo = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { label: 'Selesai', variant: 'success' as const };
      case 'CANCELLED':
        return { label: 'Dibatalkan', variant: 'error' as const };
      case 'REFUNDED':
        return { label: 'Direfund', variant: 'warning' as const };
      default:
        return { label: status, variant: 'warning' as const };
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return { label: 'Lunas', variant: 'success' as const };
      case 'UNPAID':
        return { label: 'Belum Lunas', variant: 'warning' as const };
      case 'PARTIAL':
        return { label: 'Sebagian', variant: 'info' as const };
      default:
        return { label: status, variant: 'warning' as const };
    }
  };

  const statusInfo = getStatusBadgeInfo(tx.status);
  const paymentBadge = getPaymentStatusBadge(tx.payment_status);

  const handleArchive = () => {
    if (!hasPermission('settings.manage')) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki izin untuk mengarsipkan transaksi.');
      return;
    }
    Alert.alert(
      'Arsip Transaksi',
      'Pengarsipan riwayat transaksi dilakukan melalui menu Pengaturan Sistem > Transaction Archive.\n\nBuka menu Arsip Transaksi sekarang?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buka Arsip',
          onPress: () => {
            onClose();
            router.push('/settings/system-configuration/transaction-archive');
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    if (!hasPermission('settings.manage') && !hasPermission('transaction.cancel')) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki izin untuk menghapus transaksi.');
      return;
    }

    if (tx.status === 'COMPLETED' || tx.status === 'REFUNDED') {
      Alert.alert(
        `Transaksi ${tx.status}`,
        `Transaksi dengan status ${tx.status} tidak dapat dihapus secara individual demi integritas pembukuan dan stok.\n\nGunakan menu Arsip Transaksi di Pengaturan Sistem untuk mengarsipkan dan membersihkan riwayat penjualan.`,
        [
          { text: 'Batal', style: 'cancel' },
          ...(hasPermission('settings.manage')
            ? [
                {
                  text: 'Buka Arsip Transaksi',
                  onPress: () => {
                    onClose();
                    router.push('/settings/system-configuration/transaction-archive');
                  },
                },
              ]
            : []),
        ]
      );
      return;
    }

    Alert.alert(
      'Hapus Transaksi',
      `Apakah Anda yakin ingin menghapus transaksi ${tx.transaction_number}? Tindakan ini permanen dan tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const res = await transactionService.deleteTransaction(tx.id);
              if (res.success) {
                Alert.alert('Sukses', res.message || 'Transaksi berhasil dihapus.');
                onClose();
                onTransactionDeleted?.();
              } else {
                Alert.alert('Gagal', res.message || 'Gagal menghapus transaksi.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Terjadi kesalahan saat menghapus transaksi.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
    <Modal visible={visible && !previewVisible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.txNumber, { color: colors.textPrimary }]}>{tx.transaction_number}</Text>
              <Text style={[styles.txDate, { color: colors.textSecondary }]}>{formatDate(tx.created_at)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status & Overview */}
            <View style={styles.statusRow}>
              <Badge label={statusInfo.label} variant={statusInfo.variant} />
              <Badge label={`PEMBAYARAN: ${paymentBadge.label.toUpperCase()}`} variant={paymentBadge.variant} />
            </View>

            {/* Customer & Cashier Info */}
            <Card variant="subtle" style={[styles.infoCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Kasir:</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{cashier?.name || (tx.cashier_id || 'System')}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Pelanggan:</Text>
                <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{customer?.name || 'Walk-in Customer'}</Text>
              </View>
              {customer?.phone && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>No. HP:</Text>
                  <Text style={[styles.infoVal, { color: colors.textPrimary }]}>{customer.phone}</Text>
                </View>
              )}
            </Card>

            {/* Itemized Snapshot Breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rincian Produk</Text>
            <Card variant="standard" style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {items.map((item, idx) => (
                <View key={item.id || idx} style={[styles.itemRow, idx < items.length - 1 && [styles.itemBorder, { borderBottomColor: colors.border }]]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.product_name_snapshot}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                      {item.sku_snapshot ? `SKU: ${item.sku_snapshot} • ` : ''}
                      {item.quantity} x {formatCurrency(item.unit_price)}
                    </Text>
                  </View>
                  <Text style={[styles.itemSubtotal, { color: colors.textPrimary }]}>{formatCurrency(item.subtotal)}</Text>
                </View>
              ))}
            </Card>

            {/* Payment Details */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rincian Pembayaran</Text>
            <Card variant="standard" style={[styles.payCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              {payments.map((p, idx) => (
                <View key={p.id || idx} style={styles.payRow}>
                  <Text style={[styles.payLabel, { color: colors.textSecondary }]}>Metode Pembayaran ({p.payment_method.toUpperCase()})</Text>
                  <Text style={[styles.payValue, { color: colors.textPrimary }]}>{formatCurrency(p.amount)}</Text>
                </View>
              ))}
              {payments.some((p) => p.reference_number) && (
                <View style={styles.payRow}>
                  <Text style={[styles.payLabel, { color: colors.textSecondary }]}>No. Referensi / Transaksi</Text>
                  <Text style={[styles.payValue, { color: colors.textPrimary }]}>
                    {payments.map((p) => p.reference_number).filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
              {payments.some((p) => p.payment_method === 'cash') && (
                <>
                  <View style={styles.payRow}>
                    <Text style={[styles.payLabel, { color: colors.textSecondary }]}>Tunai Diterima</Text>
                    <Text style={[styles.payValue, { color: colors.textPrimary }]}>
                      {formatCurrency(payments.find((p) => p.payment_method === 'cash')?.received_amount || tx.total_amount)}
                    </Text>
                  </View>
                  <View style={styles.payRow}>
                    <Text style={[styles.payLabel, { color: colors.textSecondary }]}>Kembalian</Text>
                    <Text style={[styles.payValue, { color: colors.success, fontWeight: '700' }]}>
                      {formatCurrency(payments.find((p) => p.payment_method === 'cash')?.change_amount || 0)}
                    </Text>
                  </View>
                </>
              )}
            </Card>

            {/* Subtotals & Discounts */}
            <Card variant="subtle" style={[styles.summaryCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <View style={styles.sumRow}>
                <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.sumVal, { color: colors.textPrimary }]}>{formatCurrency(tx.subtotal)}</Text>
              </View>
              {tx.discount_amount > 0 && (
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Diskon</Text>
                  <Text style={[styles.sumVal, { color: colors.error }]}>-{formatCurrency(tx.discount_amount)}</Text>
                </View>
              )}
              <View style={[styles.sumRow, styles.grandTotalRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.grandTotalLabel, { color: colors.textPrimary }]}>TOTAL AKHIR</Text>
                <Text style={[styles.grandTotalVal, { color: colors.primary }]}>{formatCurrency(tx.total_amount)}</Text>
              </View>
            </Card>
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
              <Button title="Arsip Transaksi" variant="outline" onPress={handleArchive} style={{ flex: 1 }} />
              <Button title="Hapus Transaksi" variant="danger" onPress={handleDelete} loading={deleting} style={{ flex: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button title="Tutup Detail" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
              <Button 
                title="Lihat Struk" 
                variant="primary" 
                onPress={async () => {
                  const rData = await receiptService.buildReceiptDataFromDetail(detail);
                  setReceiptData(rData);
                  setPreviewVisible(true);
                }} 
                style={{ flex: 1 }} 
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
    <ReceiptPreviewModal 
      visible={previewVisible}
      receiptData={receiptData}
      onClose={() => setPreviewVisible(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  txNumber: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  txDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  closeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  body: {
    padding: theme.spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  infoCard: {
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  infoVal: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  sectionTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  itemCard: {
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  itemMeta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  itemSubtotal: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  payCard: {
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  payValue: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  summaryCard: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sumLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  sumVal: {
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  grandTotalRow: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  grandTotalLabel: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  grandTotalVal: {
    ...theme.typography.price,
    color: theme.colors.primary,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
