import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler, ToastAndroid, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  reportService,
  ReportSummary,
  PaymentBreakdownItem,
  TopProductItem,
} from '@/services/report/ReportService';
import { DateRangePreset } from '@/utils/dateRange';
import { formatCurrency } from '@/utils/currency';
import { theme, useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';

export default function DashboardScreen() {
  const { hasPermission } = useAuth();
  const { colors } = useTheme();
  const [dateRange, setDateRange] = useState<DateRangePreset>('today');
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdownItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumResult, payResult, topResult] = await Promise.allSettled([
        reportService.getSummary({ dateRange }),
        reportService.getPaymentBreakdown({ dateRange }),
        reportService.getTopProducts({ dateRange }, 5),
      ]);

      if (sumResult.status === 'fulfilled') setSummary(sumResult.value);
      if (payResult.status === 'fulfilled') setPaymentBreakdown(payResult.value);
      if (topResult.status === 'fulfilled') setTopProducts(topResult.value);
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      let lastBackPress = 0;
      const onBackPress = () => {
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPress = now;
        ToastAndroid.show('Tekan sekali lagi untuk keluar', ToastAndroid.SHORT);
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [])
  );

  const renderDatePresets = () => {
    const presets: { label: string; value: DateRangePreset }[] = [
      { label: 'Hari Ini', value: 'today' },
      { label: 'Kemarin', value: 'yesterday' },
      { label: '7 Hari', value: 'week' },
      { label: 'Bulan Ini', value: 'month' },
      { label: 'Bulan Lalu', value: 'last_month' },
      { label: 'Semua Waktu', value: 'all' },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {presets.map((p) => {
          const active = dateRange === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              activeOpacity={0.75}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setDateRange(p.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <ScreenContainer scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Beranda"
            subtitle="Ringkasan performa dan penjualan bisnis"
            rightElement={loading ? <Badge label="Memuat..." variant="info" /> : <Badge label="Aktif" variant="success" />}
          />

          {renderDatePresets()}

          <SectionHeader title="Ringkasan Penjualan" subtitle="Performa penjualan untuk periode yang dipilih" style={{ marginTop: theme.spacing.lg }} />
          <ResponsiveGrid minColumnWidth={220} gap={theme.spacing.md}>
            <StatCard
              title="Penjualan Kotor"
              value={formatCurrency(summary?.grossSales || 0)}
              iconName="dashboard"
            />
            <StatCard
              title="Penjualan Bersih"
              value={formatCurrency((summary?.grossSales || 0) - (summary?.totalDiscount || 0))}
              trend={`Diskon: ${formatCurrency(summary?.totalDiscount || 0)}`}
              iconName="transactions"
            />
            <StatCard
              title="Transaksi Selesai"
              value={summary?.completedCount || 0}
              iconName="customers"
            />
            <StatCard
              title="Rata-rata Transaksi"
              value={formatCurrency(summary?.avgBasketSize || 0)}
              iconName="reports"
            />
          </ResponsiveGrid>

          <SectionHeader title="Analisis Pembayaran" subtitle="Rincian penerimaan berdasarkan metode pembayaran" style={{ marginTop: theme.spacing.xl }} />
          <Card variant="standard" style={{ padding: theme.spacing.md }}>
            {paymentBreakdown.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada data pembayaran untuk periode ini.</Text>
            ) : (
              paymentBreakdown.map((item, index) => (
                <View
                  key={item.paymentMethod}
                  style={[
                    styles.listItem,
                    index > 0 && [styles.listBorder, { borderTopColor: colors.border }],
                  ]}
                >
                  <View>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.paymentMethod.toUpperCase()}</Text>
                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.transactionCount} transaksi ({item.percentage}%)</Text>
                  </View>
                  <Text style={[styles.itemValue, { color: colors.textPrimary }]}>{formatCurrency(item.totalAmount)}</Text>
                </View>
              ))
            )}
          </Card>

          <SectionHeader title="Performa Produk" subtitle="Produk terlaris pada periode ini" style={{ marginTop: theme.spacing.xl }} />
          <Card variant="standard" style={{ padding: theme.spacing.md }}>
            {topProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Belum ada penjualan produk untuk periode ini.</Text>
            ) : (
              topProducts.map((item, index) => (
                <View
                  key={item.productId || index}
                  style={[
                    styles.listItem,
                    index > 0 && [styles.listBorder, { borderTopColor: colors.border }],
                  ]}
                >
                  <View>
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.productName}</Text>
                    <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.quantitySold} terjual</Text>
                  </View>
                  <Text style={[styles.itemValue, { color: colors.primary }]}>{formatCurrency(item.totalRevenue)}</Text>
                </View>
              ))
            )}
          </Card>

          <SectionHeader title="Statistik Transaksi" subtitle="Status dan agregat penjualan" style={{ marginTop: theme.spacing.xl }} />
          <ResponsiveGrid minColumnWidth={220} gap={theme.spacing.md}>
            <StatCard
              title="Total Transaksi"
              value={summary?.totalTransactions || 0}
              iconName="transactions"
            />
            <StatCard
              title="Produk Terjual"
              value={summary?.totalItemsSold || 0}
              iconName="products"
            />
            <StatCard
              title="Dibatalkan (Void)"
              value={summary?.cancelledCount || 0}
              iconName="reports"
            />
            <StatCard
              title="Dikembalikan (Refund)"
              value={summary?.refundedCount || 0}
              iconName="reports"
            />
          </ResponsiveGrid>
          <View style={{ height: 40 }} />
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
  },
  chipText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  listBorder: {
    borderTopWidth: 1,
  },
  itemTitle: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
  },
  itemSubtitle: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  itemValue: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    textAlign: 'center',
    padding: theme.spacing.md,
  },
});
