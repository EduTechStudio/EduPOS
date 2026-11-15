import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  transactionService,
  TransactionListItem,
  TransactionDetail,
  
} from '@/services/transaction/TransactionService';
import { TransactionDetailModal } from '@/components/transaction/TransactionDetailModal';
import { DateRangePreset } from '@/utils/dateRange';
import { formatCurrency } from '@/utils/currency';
import { useResponsive } from '@/hooks/useResponsive';
import { theme, useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { receiptService } from '@/services/receipt/ReceiptService';
import { ReceiptPreviewModal } from '@/components/receipt/ReceiptPreviewModal';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function TransactionsScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission } = useAuth();
  const { isTablet } = useResponsive();

  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);

  if (!hasPermission('transaction.view')) {
    return (
      <ScreenContainer>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <Text style={{...theme.typography.header3, color: theme.colors.error}}>Akses Ditolak</Text>
        </View>
      </ScreenContainer>
    );
  }
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangePreset>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  
  // Selected detail state for tablet split layout or modal
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TransactionDetail | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [receiptData, setReceiptData] = useState<any>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const list = await transactionService.getTransactions({
        search,
        dateRange,
        paymentMethod: paymentFilter,
      });
      setTransactions(list);

      // On tablet, default select first item if available and no selection
      if (isTablet && list.length > 0 && !selectedTxId) {
        handleSelectTransaction(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [search, dateRange, paymentFilter, isTablet, selectedTxId]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const [deletingTablet, setDeletingTablet] = useState(false);

  const handleTabletArchive = () => {
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
            router.push('/settings/system-configuration/transaction-archive');
          },
        },
      ]
    );
  };

  const handleTabletDelete = () => {
    if (!selectedDetail) return;
    const { transaction: tx } = selectedDetail;

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
              setDeletingTablet(true);
              const res = await transactionService.deleteTransaction(tx.id);
              if (res.success) {
                Alert.alert('Sukses', res.message || 'Transaksi berhasil dihapus.');
                setSelectedDetail(null);
                setSelectedTxId(null);
                fetchTransactions();
              } else {
                Alert.alert('Gagal', res.message || 'Gagal menghapus transaksi.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Terjadi kesalahan saat menghapus transaksi.');
            } finally {
              setDeletingTablet(false);
            }
          },
        },
      ]
    );
  };

  const handleSelectTransaction = async (txId: string) => {
    setSelectedTxId(txId);
    setLoadingDetail(true);
    try {
      const detail = await transactionService.getTransactionDetail(txId);
      setSelectedDetail(detail);
      if (!isTablet) {
        setDetailModalVisible(true);
      }
    } catch (err) {
      console.error('Failed to load transaction detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
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

  const hasActiveFilters = search !== '' || dateRange !== 'all' || paymentFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setDateRange('all');
    setPaymentFilter('all');
  };

  const renderFilterChips = () => {
    const presets: { label: string; value: DateRangePreset }[] = [
      { label: 'Semua Periode', value: 'all' },
      { label: 'Hari Ini', value: 'today' },
      { label: 'Kemarin', value: 'yesterday' },
      { label: '7 Hari', value: 'week' },
      { label: 'Bulan Ini', value: 'month' },
    ];

    const payments = [
      { label: 'Semua Pembayaran', value: 'all' },
      { label: 'Tunai (Cash)', value: 'cash' },
      { label: 'QRIS', value: 'qris' },
      { label: 'Transfer Bank', value: 'bank_transfer' },
      { label: 'Kartu Debit', value: 'debit' },
    ];

    return (
      <View style={styles.filterSection}>
        {/* Date Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ paddingVertical: 2 }}>
          {presets.map((p) => {
            const active = dateRange === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setDateRange(p.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Payment Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ paddingVertical: 2 }}>
          {payments.map((pm) => {
            const active = paymentFilter === pm.value;
            return (
              <TouchableOpacity
                key={pm.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.accent : colors.surface,
                    borderColor: active ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setPaymentFilter(pm.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: active ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {pm.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTransactionCard = (tx: TransactionListItem) => {
    const isSelected = isTablet && selectedTxId === tx.id;
    const { label: statusLabel, variant: statusVariant } = getStatusBadgeInfo(tx.status);
    const payMethodsLabel = tx.payment_methods?.join(', ').toUpperCase() || 'CASH';

    return (
      <TouchableOpacity
        key={tx.id}
        onPress={() => handleSelectTransaction(tx.id)}
        activeOpacity={0.7}
      >
        <Card
          variant="standard"
          style={[
            styles.card,
            { borderColor: isSelected ? colors.primary : colors.border },
            isSelected && { borderWidth: 2, backgroundColor: colors.primarySoft + '40' },
          ]}
        >
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.numberRow}>
                <Text style={[styles.txNum, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
                  {tx.transaction_number}
                </Text>
                <Badge label={statusLabel} variant={statusVariant} />
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                Kasir: {tx.cashier_name} • Pelanggan: {tx.customer_name || 'Walk-in'}
              </Text>
              <Text style={[styles.metaTime, { color: colors.textMuted }]}>
                {formatDate(tx.created_at)}
              </Text>
            </View>

            <View style={styles.rightCol}>
              <Text
                style={[styles.amount, { color: colors.primary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {formatCurrency(tx.total_amount)}
              </Text>
              <Badge label={payMethodsLabel} variant="info" />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderTabletDetailPanel = () => {
    if (loadingDetail) {
      return (
        <Card variant="standard" style={[styles.tabletDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat detail transaksi...</Text>
        </Card>
      );
    }

    if (!selectedDetail) {
      return (
        <Card variant="subtle" style={[styles.tabletDetailCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, padding: 24, gap: 12 }}>
            <Icon name="transactions" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyDetailText, { color: colors.textSecondary }]}>
              Pilih transaksi dari daftar di sebelah kiri untuk melihat rincian lengkap.
            </Text>
          </View>
        </Card>
      );
    }

    const { transaction: tx, customer, cashier, items, payments } = selectedDetail;
    const { label: statusLabel, variant: statusVariant } = getStatusBadgeInfo(tx.status);
    const paymentBadge = getPaymentStatusBadge(tx.payment_status);

    return (
      <Card variant="standard" style={[styles.tabletDetailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.txNumberLarge, { color: colors.textPrimary }]}>{tx.transaction_number}</Text>
              <Text style={[styles.txDate, { color: colors.textSecondary }]}>{formatDate(tx.created_at)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Badge label={statusLabel} variant={statusVariant} />
              <Badge label={`PEMBAYARAN: ${paymentBadge.label.toUpperCase()}`} variant={paymentBadge.variant} />
            </View>
          </View>

          {/* Info snapshot */}
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
          <View style={[styles.itemContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {items.map((item, idx) => (
              <View key={item.id || idx} style={[styles.itemRow, idx < items.length - 1 && [styles.itemBorder, { borderBottomColor: colors.border }]]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.product_name_snapshot}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                    {item.sku_snapshot ? `SKU: ${item.sku_snapshot} • ` : ''}
                    {item.quantity} x {formatCurrency(item.unit_price)}
                  </Text>
                </View>
                <Text style={[styles.itemSubtotal, { color: colors.textPrimary }]}>{formatCurrency(item.subtotal)}</Text>
              </View>
            ))}
          </View>

          {/* Payment breakdown */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Rincian Pembayaran</Text>
          <Card variant="subtle" style={[styles.payCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            {payments.map((p, idx) => (
              <View key={p.id || idx} style={styles.payRow}>
                <Text style={[styles.payLabel, { color: colors.textSecondary }]}>Metode ({p.payment_method.toUpperCase()})</Text>
                <Text style={[styles.payValue, { color: colors.textPrimary }]}>{formatCurrency(p.amount)}</Text>
              </View>
            ))}
            {payments.some((p) => p.reference_number) && (
              <View style={styles.payRow}>
                <Text style={[styles.payLabel, { color: colors.textSecondary }]}>No. Referensi</Text>
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

          {/* Totals */}
          <Card variant="standard" style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
          
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button 
                title="Arsip Transaksi" 
                variant="outline" 
                onPress={handleTabletArchive} 
                style={{ flex: 1 }} 
              />
              <Button 
                title="Hapus Transaksi" 
                variant="danger" 
                onPress={handleTabletDelete} 
                loading={deletingTablet} 
                style={{ flex: 1 }} 
              />
            </View>
            <Button 
              title="Lihat Struk" 
              variant="primary" 
              onPress={async () => {
                if (selectedDetail) {
                  const rData = await receiptService.buildReceiptDataFromDetail(selectedDetail);
                  setReceiptData(rData);
                  setPreviewVisible(true);
                }
              }} 
            />
          </View>
        </ScrollView>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <Card variant="subtle" style={[styles.emptyCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
      <Icon name="transactions" size={48} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {hasActiveFilters ? 'Tidak Ada Transaksi Sesuai Filter' : 'Belum Ada Transaksi'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {hasActiveFilters
          ? 'Coba sesuaikan kata kunci pencarian, filter tanggal, atau metode pembayaran.'
          : 'Transaksi penjualan yang telah selesai akan tercatat di sini.'}
      </Text>
      {hasActiveFilters && (
        <Button
          title="Reset Filter"
          variant="outline"
          size="sm"
          style={{ marginTop: 12 }}
          onPress={resetFilters}
        />
      )}
    </Card>
  );

  return (
    <ScreenContainer scrollable={false}>
      <ResponsiveContainer maxWidth={1400} style={{ flex: 1 }}>
        <SectionHeader
          title="Riwayat Transaksi"
          subtitle={`Total ${transactions.length} transaksi tercatat`}
        />

        <Input
          placeholder="Cari no. transaksi (TRX-...), pelanggan, atau catatan..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Icon name="search" size={18} color={colors.textMuted} />}
        />

        {renderFilterChips()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Memuat riwayat transaksi...</Text>
          </View>
        ) : isTablet ? (
          /* Tablet Split Screen Layout */
          <View style={styles.tabletSplitContainer}>
            <View style={styles.tabletLeftCol}>
              {transactions.length === 0 ? (
                renderEmptyState()
              ) : (
                <FlatList
                  data={transactions}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => renderTransactionCard(item)}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
            <View style={styles.tabletRightCol}>
              {renderTabletDetailPanel()}
            </View>
          </View>
        ) : (
          /* Phone Single Column List */
          <View style={styles.phoneListContainer}>
            {transactions.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderTransactionCard(item)}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </ResponsiveContainer>

      {/* Phone Detail Modal */}
      {!isTablet && (
        <TransactionDetailModal
          visible={detailModalVisible}
          detail={selectedDetail}
          onClose={() => setDetailModalVisible(false)}
          onTransactionDeleted={fetchTransactions}
        />
      )}

      <ReceiptPreviewModal 
        visible={previewVisible}
        receiptData={receiptData}
        onClose={() => setPreviewVisible(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterSection: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.xs,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipSubtle: {
    backgroundColor: theme.colors.background,
  },
  chipSubtleActive: {
    backgroundColor: theme.colors.textPrimary,
    borderColor: theme.colors.textPrimary,
  },
  chipText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.surface,
    fontWeight: '600',
  },
  card: {
    marginBottom: theme.spacing.sm,
  },
  selectedCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.surface,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  txNum: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  meta: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  metaTime: {
    ...theme.typography.caption,
    marginTop: 2,
    fontSize: 11,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    ...theme.typography.price,
    color: theme.colors.primary,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  emptyCard: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  emptyTitle: {
    ...theme.typography.header3,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  /* Tablet split layout styles */
  phoneListContainer: {
    flex: 1,
  },
  tabletSplitContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  tabletLeftCol: {
    flex: 5,
  },
  tabletRightCol: {
    flex: 7,
  },
  tabletDetailCard: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  emptyDetailText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  txNumberLarge: {
    ...theme.typography.header2,
    color: theme.colors.textPrimary,
  },
  txDate: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  infoCard: {
    marginBottom: theme.spacing.md,
    gap: 4,
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
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  itemContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
    gap: 4,
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
});
