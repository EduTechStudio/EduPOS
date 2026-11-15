import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon, IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { theme, useTheme } from '@/theme';
import { EditProfileModal } from '@/components/users/EditProfileModal';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  route: string;
  visible: boolean;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const { colors, isDark } = useTheme();
  const { currentUser, currentRole, hasPermission, logout } = useAuth();
  const [editProfileVisible, setEditProfileVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari sesi kasir saat ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const groups: MenuGroup[] = [
    {
      title: 'Operasional Toko',
      items: [
        {
          id: 'customers',
          title: 'Pelanggan',
          subtitle: 'Kelola data pelanggan, kontak, dan riwayat belanja',
          icon: 'customers',
          route: '/customers',
          visible: hasPermission('customer.view'),
        },
        {
          id: 'transactions-history',
          title: 'Riwayat Transaksi',
          subtitle: 'Lihat status penjualan, cetak ulang struk, dan arsip',
          icon: 'transactions',
          route: '/transactions',
          visible: hasPermission('transaction.view'),
        },
      ],
    },
    {
      title: 'Pengaturan & Konfigurasi',
      items: [
        {
          id: 'store-settings',
          title: 'Pengaturan Toko',
          subtitle: 'Profil toko, printer & struk, metode pembayaran, dan hak akses',
          icon: 'store',
          route: '/settings',
          visible: hasPermission('settings.view') || hasPermission('user.view') || hasPermission('printer.manage'),
        },
        {
          id: 'system-configuration',
          title: 'Data & Pemeliharaan',
          subtitle: 'Cadangkan & pulihkan database, arsip transaksi, dan pemeliharaan',
          icon: 'database',
          route: '/settings/system-configuration',
          visible: hasPermission('settings.manage'),
        },
      ],
    },
  ];

  return (
    <ScreenContainer scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Menu Lainnya"
            subtitle="Pusat operasional dan pengaturan sistem toko"
          />

          {/* User Profile Card */}
          <Card variant="standard" style={styles.userCard}>
            <View style={styles.userInfoRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primarySoft }]}>
                <Icon name="user" size={24} color={colors.primary} />
              </View>
              <View style={styles.userMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
                  <Text style={[styles.userName, { color: colors.textPrimary }]}>{currentUser?.name || 'Kasir'}</Text>
                  <Badge label={currentRole?.name || 'Staff'} variant="info" />
                </View>
                <Text style={[styles.userSub, { color: colors.textSecondary }]}>Username: @{currentUser?.username || 'user'}</Text>
              </View>
            </View>
            <View style={[styles.userDivider, { backgroundColor: colors.border }]} />
            <View style={styles.userActionsRow}>
              <Button
                title="Edit Profil"
                variant="outline"
                size="sm"
                onPress={() => setEditProfileVisible(true)}
                leftIcon={<Icon name="edit" size={15} color={colors.primary} style={{ marginRight: 6 }} />}
                style={{ flex: 1 }}
              />
              <Button
                title="Keluar"
                variant="outline"
                size="sm"
                onPress={handleLogout}
                leftIcon={<Icon name="logout" size={15} color={colors.error} style={{ marginRight: 6 }} />}
                textStyle={{ color: colors.error }}
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          <EditProfileModal
            visible={editProfileVisible}
            onClose={() => setEditProfileVisible(false)}
          />

          {/* Menu Groups */}
          {groups.map((group) => {
            const visibleItems = group.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <View key={group.title} style={styles.groupContainer}>
                <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>{group.title}</Text>
                <View style={[styles.menuContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {visibleItems.map((item, idx) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.menuItem,
                        idx < visibleItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
                      ]}
                      activeOpacity={0.7}
                      onPress={() => router.push(item.route as any)}
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
                        <Icon name={item.icon} size={20} color={colors.primary} />
                      </View>
                      <View style={styles.textContainer}>
                        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                      </View>
                      <Icon name="chevronRight" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  userCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.radius.lg,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  userSub: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  userDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.md,
  },
  userActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  logoutBtn: {
    borderColor: theme.colors.errorLight,
  },
  groupContainer: {
    marginBottom: theme.spacing.lg,
  },
  groupTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    minHeight: 64,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  itemTitle: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  itemSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
