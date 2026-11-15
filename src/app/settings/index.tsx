import React, { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, BackHandler } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { ResponsiveGrid } from '@/components/layout/ResponsiveGrid';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Icon, IconName } from '@/components/ui/Icon';
import { defaultPOSConfig } from '@/config/defaultPOSConfig';
import { businessTypePresets } from '@/config/businessTypePresets';
import { defaultReceiptConfig } from '@/config/defaultReceiptConfig';
import { defaultPrinterConfig } from '@/config/defaultPrinterConfig';
import { PrinterManager } from '@/services/printer/PrinterManager';
import { defaultPaymentMethods } from '@/config/defaultPaymentConfig';
import { initialRoles, allPermissions } from '@/config/defaultRolesAndPermissions';
import { BusinessType } from '@/types/businessType';
import { runDatabaseVerification, VerificationResult } from '@/database/verification';
import { theme, useTheme } from '@/theme';

export default function SettingsIndexScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission } = useAuth();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/more');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleBack])
  );

  const canAccess = 
    hasPermission('settings.view') || 
    hasPermission('user.view') || 
    hasPermission('printer.manage') || 
    hasPermission('receipt.manage') || 
    hasPermission('payment.gateway.manage');

  if (!canAccess) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader
            title="Pengaturan Toko"
            subtitle="Pusat konfigurasi toko dan perangkat"
            onBack={handleBack}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.colors.error, marginBottom: 8 }}>
              Akses Ditolak
            </Text>
            <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>
              Anda tidak memiliki izin untuk mengakses Pengaturan Toko.
            </Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  const menuItems = [];

  if (hasPermission('settings.view')) {
    menuItems.push({ id: 'store-profile', title: 'Profil Toko', subtitle: 'Nama toko, alamat, kontak, logo, dan jenis usaha.', icon: 'store' as any, route: '/settings/store-profile' });
  }
  
  if (hasPermission('printer.manage') || hasPermission('receipt.manage')) {
    menuItems.push({ id: 'receipt-printer', title: 'Printer & Struk', subtitle: 'Konfigurasi format struk belanja dan koneksi printer.', icon: 'printer' as any, route: '/settings/receipt-printer' });
  }

  if (hasPermission('receipt.manage')) {
    menuItems.push({ id: 'receipt-templates', title: 'Desain Template Struk', subtitle: 'Kustomisasi blok, tata letak, dan format cetak struk belanja.', icon: 'receipt' as any, route: '/settings/receipt-templates' });
  }
  
  if (hasPermission('payment.gateway.manage')) {
    menuItems.push({ id: 'payment-methods', title: 'Metode Pembayaran', subtitle: 'Atur metode pembayaran tunai, QRIS, transfer, dan debit.', icon: 'payment' as any, route: '/settings/payment-methods' });
  }

  if (hasPermission('user.view')) {
    menuItems.push({ id: 'users-permissions', title: 'Pengguna & Hak Akses', subtitle: 'Kelola data kasir, peran, hak akses, dan PIN.', icon: 'security' as any, route: '/settings/users-permissions' });
  }
  
  if (hasPermission('settings.manage')) {
    menuItems.push({ id: 'system-configuration', title: 'Data & Pemeliharaan', subtitle: 'Cadangan, pemulihan, arsip transaksi, dan pemeliharaan.', icon: 'database' as any, route: '/settings/system-configuration' });
  }

  if (hasPermission('settings.manage') || hasPermission('settings.view')) {
    menuItems.push({ id: 'app-update', title: 'Pembaruan Aplikasi', subtitle: 'Periksa versi baru dan pasang pembaruan sistem.', icon: 'refresh' as any, route: '/settings/app-update' });
  }

  return (
    <ScreenContainer>
      <ResponsiveContainer>
        <SectionHeader
          title="Pengaturan Toko"
          subtitle="Pusat konfigurasi toko dan perangkat"
          onBack={handleBack}
        />
        <View style={[localStyles.menuContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                localStyles.menuItem,
                { borderBottomColor: colors.border },
                idx === menuItems.length - 1 && { borderBottomWidth: 0 }
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[localStyles.iconContainer, { backgroundColor: colors.primarySoft }]}>
                <Icon name={item.icon} size={28} color={colors.primary} />
              </View>
              <View style={localStyles.textContainer}>
                <Text style={[localStyles.menuTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[localStyles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
              </View>
              <View style={localStyles.chevronContainer}>
                <Icon name="chevronRight" size={24} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ResponsiveContainer>
    </ScreenContainer>
  );
}

const localStyles = StyleSheet.create({
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 80,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  menuTitle: {
    ...theme.typography.bodyLarge,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  menuSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  chevronContainer: {
    marginLeft: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
