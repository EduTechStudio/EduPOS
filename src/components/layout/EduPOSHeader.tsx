import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, useTheme } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { EditProfileModal } from '@/components/users/EditProfileModal';

export const ROUTE_PAGE_TITLES: Record<string, { full: string; compact: string }> = {
  index: { full: 'Beranda', compact: 'Beranda' },
  pos: { full: 'Kasir', compact: 'Kasir' },
  transactions: { full: 'Riwayat Transaksi', compact: 'Transaksi' },
  products: { full: 'Katalog Produk', compact: 'Produk' },
  more: { full: 'Menu Lainnya', compact: 'Lainnya' },
  customers: { full: 'Direktori Pelanggan', compact: 'Pelanggan' },
  settings: { full: 'Pusat Konfigurasi', compact: 'Pengaturan' },
};

interface EduPOSHeaderProps {
  routeName?: string;
  optionsTitle?: string;
  dbReady?: boolean;
}

export function EduPOSHeader({ routeName = 'index', optionsTitle, dbReady }: EduPOSHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { currentUser, currentRole, logout } = useAuth();
  const { isTablet, isLandscape, width } = useResponsive();
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Derive responsive page title
  const titleConfig = ROUTE_PAGE_TITLES[routeName];
  const isCompact = !isTablet && !isLandscape && width < 500;
  const pageTitle = titleConfig
    ? (isCompact ? titleConfig.compact : titleConfig.full)
    : (optionsTitle || routeName);

  // Brand header colors
  const headerBg = isDark ? colors.surface : '#064789';
  const headerTextColor = '#FFFFFF';

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari sesi akun saat ini?',
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

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: headerBg,
            paddingTop: insets.top,
            borderBottomColor: colors.border,
            borderBottomWidth: isDark ? 1 : 0,
          },
        ]}
      >
        <View
          style={[
            styles.contentRow,
            {
              paddingLeft: Math.max(insets.left, theme.spacing.md),
              paddingRight: Math.max(insets.right, theme.spacing.md) + (isTablet ? 12 : 8),
            },
          ]}
        >
          {/* Left Section: [EduPOS logo] EduPOS · [Current Page] */}
          <View style={styles.leftSection}>
            <Image
              source={require('@/assets/images/android-icon-foreground.png')}
              style={[
                styles.logo,
                {
                  width: isTablet ? 30 : 26,
                  height: isTablet ? 30 : 26,
                },
              ]}
              resizeMode="contain"
              accessibilityLabel="EduPOS Logo"
            />
            <Text style={[styles.brandText, { color: headerTextColor }]}>
              EduPOS
            </Text>
            <Text style={[styles.separatorText, { color: headerTextColor }]}>
              ·
            </Text>
            <Text
              style={[styles.pageTitleText, { color: headerTextColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {pageTitle}
            </Text>
          </View>

          {/* Right Section: User Avatar, Username, Role, Logout */}
          <View style={styles.rightSection}>
            {/* Tablet DB status indicator */}
            {isTablet && (
              <View
                style={[
                  styles.dbBadge,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : 'rgba(255, 255, 255, 0.15)',
                  },
                ]}
              >
                <View style={[styles.dbDot, { backgroundColor: dbReady ? '#4ADE80' : '#FBBF24' }]} />
                <Text style={[styles.dbText, { color: headerTextColor }]}>
                  {dbReady ? 'SQLite Siap' : 'Memuat...'}
                </Text>
              </View>
            )}

            {/* User Profile Area (Tappable to Edit Profile) */}
            <TouchableOpacity
              style={styles.userProfileArea}
              onPress={() => setProfileModalVisible(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Profil pengguna ${currentUser?.username || currentUser?.name || 'Kasir'}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <View
                style={[
                  styles.avatarCircle,
                  {
                    backgroundColor: isDark ? colors.surfaceSubtle : 'rgba(255, 255, 255, 0.2)',
                  },
                ]}
              >
                <Icon name="user" size={15} color={headerTextColor} />
              </View>
              <View style={styles.userMetaColumn}>
                <Text
                  style={[
                    styles.usernameText,
                    {
                      color: headerTextColor,
                      maxWidth: isCompact ? 85 : 140,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentUser?.username || currentUser?.name || 'Kasir'}
                </Text>
                <Text
                  style={[
                    styles.roleText,
                    {
                      color: headerTextColor,
                      maxWidth: isCompact ? 85 : 140,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentRole?.name || 'Staff'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Logout Icon */}
            <TouchableOpacity
              onPress={handleLogout}
              style={[
                styles.logoutButton,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : 'rgba(255, 255, 255, 0.15)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Keluar dari akun"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="logout" size={16} color={headerTextColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Profile Editing Modal for Current User */}
      <EditProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    zIndex: 100,
  },
  contentRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: theme.spacing.sm,
  },
  logo: {
    marginRight: 6,
  },
  brandText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  separatorText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 5,
    opacity: 0.75,
  },
  pageTitleText: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    marginRight: 4,
  },
  dbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dbText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userProfileArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: theme.radius.md,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  userMetaColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  usernameText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.85,
    lineHeight: 13,
  },
  logoutButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
