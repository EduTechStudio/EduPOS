import React, { useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Icon, IconName } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';

interface SettingsItemProps {
  title: string;
  subtitle: string;
  icon: IconName;
  onPress: () => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ title, subtitle, icon, onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={[styles.itemContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Icon name="chevronRight" size={24} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

export default function SystemConfigurationHubScreen() {
  const { colors } = useTheme();
  const { hasPermission } = useAuth();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/settings');
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

  if (!hasPermission('settings.manage')) {
    return (
      <ScreenContainer>
        <ResponsiveContainer>
          <SectionHeader
            title="Data & Pemeliharaan"
            subtitle="Cadangan dan pemeliharaan database"
            onBack={handleBack}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.error, marginBottom: 8 }}>
              Akses Ditolak
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Anda tidak memiliki izin untuk mengakses Data & Pemeliharaan.
            </Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView>
        <ResponsiveContainer>
          <SectionHeader
            title="Data & Pemeliharaan"
            subtitle="Cadangan dan pemeliharaan database"
            onBack={handleBack}
          />
          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.groupHeader, { backgroundColor: colors.background, color: colors.textSecondary }]}>Manajemen Data</Text>
            <SettingsItem
              title="Arsip Transaksi"
              subtitle="Arsipkan dan bersihkan riwayat transaksi penjualan"
              icon="transactions"
              onPress={() => router.push('/settings/system-configuration/transaction-archive')}
            />
            <SettingsItem
              title="Cadangkan & Pulihkan"
              subtitle="Ekspor atau impor cadangan database lengkap"
              icon="backup"
              onPress={() => router.push('/settings/system-configuration/backup-restore')}
            />
            
            <Text style={[styles.groupHeader, { marginTop: theme.spacing.lg, backgroundColor: colors.background, color: colors.textSecondary }]}>Basis Data</Text>
            <SettingsItem
              title="Pemeliharaan Database"
              subtitle="Verifikasi integritas database dan reset data pabrik"
              icon="database"
              onPress={() => router.push('/settings/system-configuration/database-maintenance')}
            />
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  groupHeader: {
    ...theme.typography.bodySmall,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: { flex: 1 },
  title: { ...theme.typography.bodyMedium, fontWeight: '600', color: theme.colors.textPrimary },
  subtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
});
