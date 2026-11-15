import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Icon } from '@/components/ui/Icon';
import { theme, useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';
import { UserRepository } from '@/database/repositories/UserRepository';
import { userService } from '@/services/user/UserService';
import { RoleRepository } from '@/database/repositories/RoleRepository';
import { UserPermissionRepository } from '@/database/repositories/UserPermissionRepository';
import { UserEntity, RoleEntity } from '@/database/types';
import { AddUserModal } from '@/components/users/AddUserModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { ChangePinModal } from '@/components/users/ChangePinModal';

export default function UsersPermissionsScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission, currentUser } = useAuth();
  
  const [users, setUsers] = useState<(UserEntity & { roleName: string })[]>([]);
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [addModalVisible, setAddModalVisible] = useState(false);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserEntity | null>(null);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinUser, setPinUser] = useState<UserEntity | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
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

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userRepo = new UserRepository();
      const roleRepo = new RoleRepository();
      const allRoles = await roleRepo.getAll();
      const allUsers = await userRepo.getAll();

      setRoles(allRoles);
      
      const userPermRepo = new UserPermissionRepository();
      const mapped = await Promise.all(allUsers.map(async u => {
        const overrides = await userPermRepo.getOverridesForUser(u.id);
        return {
          ...u,
          hasCustom: overrides.length > 0,
          roleName: allRoles.find(r => r.id === u.role_id)?.name || 'Unknown Role'
        };
      }));
      setUsers(mapped);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal memuat pengguna');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  if (!hasPermission('user.view')) {
    return (
      <ScreenContainer scrollable={false}>
        <View style={styles.center}>
          <Icon name="security" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>Akses Ditolak</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>Anda tidak memiliki izin untuk melihat daftar pengguna.</Text>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleBack}>
            <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const handleEdit = (user: UserEntity) => {
    if (!hasPermission('user.edit')) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki izin untuk mengubah pengguna.');
      return;
    }
    setSelectedUser(user);
    setEditModalVisible(true);
  };

  const handleChangePin = (user: UserEntity) => {
    if (!hasPermission('user.edit')) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki izin.');
      return;
    }
    setPinUser(user);
    setPinModalVisible(true);
  };

  const handleToggleActive = async (user: UserEntity) => {
    if (!hasPermission('user.edit')) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki izin.');
      return;
    }
    if (user.role_id === 'owner') {
      Alert.alert('Ditolak', 'Akun System Owner tidak dapat dinonaktifkan.');
      return;
    }
    if (user.id === currentUser?.id) {
      Alert.alert('Ditolak', 'Anda tidak dapat menonaktifkan akun yang sedang digunakan.');
      return;
    }

    try {
      const repo = new UserRepository();
      if (user.is_active) {
        await userService.deactivate(user.id);
      } else {
        await userService.activate(user.id);
      }
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal mengubah status');
    }
  };

  const handleDeleteUser = async (user: UserEntity) => {
    if (!hasPermission('user.delete')) {
      Alert.alert('Akses Ditolak', 'Anda tidak memiliki izin untuk menghapus pengguna.');
      return;
    }

    if (user.id === currentUser?.id) {
      Alert.alert('Ditolak', 'Anda tidak dapat menghapus akun yang sedang Anda gunakan.');
      return;
    }

    if (user.id === 'user_owner' || user.username === 'owner') {
      Alert.alert('Ditolak', 'Akun System Owner utama dilindungi dan tidak dapat dihapus.');
      return;
    }

    if (user.role_id === 'owner') {
      const activeOwners = users.filter((u) => u.role_id === 'owner' && u.is_active === 1);
      if (activeOwners.length <= 1) {
        Alert.alert(
          'Ditolak',
          'Tidak dapat menghapus akun Owner terakhir. Sistem memerlukan minimal satu akun Owner aktif untuk administrasi.'
        );
        return;
      }
    }

    try {
      setDeletingUserId(user.id);
      console.log('[UsersScreen] Checking historical usage for user:', user.id, user.username);
      const history = await userService.checkHistoricalUsage(user.id);
      console.log('[UsersScreen] Historical usage result:', history);

      if (history.hasHistory) {
        const total = history.transactions + history.expenses + history.draftSales;
        Alert.alert(
          `Hapus Pengguna: ${user.name}?`,
          `Pengguna @${user.username} memiliki ${total} riwayat data (transaksi/pengeluaran).\n\nDemi menjaga integritas pembukuan toko, akun ini akan dinonaktifkan secara permanen (soft delete) dan tidak dapat login kembali.\n\nLanjutkan?`,
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Nonaktifkan Permanen',
              style: 'destructive',
              onPress: async () => {
                await executeDelete(user.id);
              },
            },
          ]
        );
      } else {
        Alert.alert(
          `Hapus Pengguna: ${user.name}?`,
          `Pengguna @${user.username} belum memiliki riwayat transaksi.\n\nAkun ini akan dihapus secara permanen dari perangkat. Tindakan ini tidak dapat dibatalkan.\n\nApakah Anda yakin ingin menghapus pengguna ini?`,
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Hapus Permanen',
              style: 'destructive',
              onPress: async () => {
                await executeDelete(user.id);
              },
            },
          ]
        );
      }
    } catch (e: any) {
      console.error('[UsersScreen] handleDeleteUser history check failed:', {
        name: e?.name,
        message: e?.message,
        stack: e?.stack,
      });
      Alert.alert('Error', e.message || 'Gagal memeriksa data pengguna.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const executeDelete = async (userId: string) => {
    try {
      setDeletingUserId(userId);
      console.log('[UsersScreen] Executing deleteUser for:', userId, 'requestingUserId:', currentUser?.id);
      const result = await userService.deleteUser(userId, currentUser?.id);
      console.log('[UsersScreen] deleteUser succeeded:', result);
      Alert.alert('Sukses', result.message);
      await loadData();
    } catch (e: any) {
      console.error('[UsersScreen] executeDelete failed:', {
        name: e?.name,
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
      });
      const errorMsg = e?.message || 'Terjadi kesalahan saat menghapus pengguna.';
      Alert.alert('Gagal Menghapus', errorMsg);
    } finally {
      setDeletingUserId(null);
    }
  };

  const renderItem = ({ item }: { item: UserEntity & { roleName: string, hasCustom?: boolean } }) => (
    <View
      style={[
        styles.userCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        !item.is_active && styles.userCardInactive,
      ]}
    >
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.userUsername, { color: colors.textSecondary }]}>@{item.username}</Text>
        <Text style={{ ...theme.typography.caption, color: colors.textMuted, marginTop: 4 }}>
          Akses: {item.role_id === 'owner' ? 'Akses Penuh' : (item.hasCustom ? 'Kustom' : 'Standar Role')}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.roleBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{item.roleName}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: item.is_active ? colors.success + '20' : colors.error + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: item.is_active ? colors.success : colors.error,
                },
              ]}
            >
              {item.is_active ? 'Aktif' : 'Nonaktif'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleChangePin(item)}>
          <Icon name="security" size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>PIN</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Icon name="edit" size={18} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>Ubah</Text>
        </TouchableOpacity>
        
        {item.role_id !== 'owner' && item.id !== currentUser?.id && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleActive(item)}>
            <Icon name={item.is_active ? 'close' : 'check'} size={18} color={item.is_active ? colors.error : colors.success} />
            <Text style={[styles.actionText, { color: item.is_active ? colors.error : colors.success }]}>
              {item.is_active ? 'Nonaktif' : 'Aktifkan'}
            </Text>
          </TouchableOpacity>
        )}

        {hasPermission('user.delete') && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleDeleteUser(item)}
            disabled={deletingUserId === item.id}
          >
            <Icon name="trash" size={18} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Hapus</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScreenContainer scrollable={false}>
      <SectionHeader
        title="Pengguna & Hak Akses"
        subtitle="Kelola kasir, admin, dan hak akses pengguna sistem"
        onBack={handleBack}
        action={
          hasPermission('user.create') ? {
            icon: 'plus',
            label: 'Tambah Pengguna',
            onPress: () => setAddModalVisible(true)
          } : undefined
        }
      />
      
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !isLoading ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Icon name="security" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 12 }]}>Tidak Ada Pengguna</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Belum ada data pengguna yang terdaftar.</Text>
            </View>
          ) : null
        }
      />

      <AddUserModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => {
          setAddModalVisible(false);
          console.log('[Users] RELOADING USERS');
          loadData().then(() => console.log('[Users] USERS LOADED'));
        }}
        roles={roles}
      />

      {selectedUser && (
        <EditUserModal
          visible={editModalVisible}
          user={selectedUser}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setEditModalVisible(false);
            setSelectedUser(null);
            loadData();
          }}
          roles={roles}
        />
      )}

      {pinUser && (
        <ChangePinModal
          visible={pinModalVisible}
          user={pinUser}
          onClose={() => {
            setPinModalVisible(false);
            setPinUser(null);
          }}
          onSuccess={() => {
            setPinModalVisible(false);
            setPinUser(null);
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    ...theme.typography.header2,
    color: theme.colors.error,
    marginTop: theme.spacing.md,
  },
  errorSub: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  backBtn: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  backBtnText: {
    ...theme.typography.bodyMedium,
    fontWeight: 'bold',
  },
  list: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userCardInactive: {
    opacity: 0.6,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
  },
  userUsername: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  roleBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  roleText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  statusBadgeInactive: {
    backgroundColor: theme.colors.error + '20',
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  statusTextInactive: {
    color: theme.colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
  },
  actionText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: theme.spacing.lg,
  },
  emptyTitle: {
    ...theme.typography.header3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  emptySub: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
