import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { theme, useTheme } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { UserEntity, RoleEntity, PermissionEntity } from '@/database/types';
import { userService } from '@/services/user/UserService';
import { RoleRepository } from '@/database/repositories/RoleRepository';
import { PermissionRepository } from '@/database/repositories/PermissionRepository';
import { UserPermissionRepository } from '@/database/repositories/UserPermissionRepository';
import { PermissionEditor } from './PermissionEditor';
import { useAuth } from '@/context/AuthContext';

interface EditUserModalProps {
  visible: boolean;
  user: UserEntity;
  onClose: () => void;
  onSuccess: () => void;
  roles: RoleEntity[];
}

export function EditUserModal({ visible, user, onClose, onSuccess, roles }: EditUserModalProps) {
  const { colors, isDark } = useTheme();
  const { hasPermission, currentUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [roleId, setRoleId] = useState(user.role_id);
  const [isActive, setIsActive] = useState(user.is_active === 1);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [allPermissions, setAllPermissions] = useState<PermissionEntity[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, 'GRANT' | 'DENY'>>({});

  useEffect(() => {
    if (visible) {
      setName(user.name);
      setUsername(user.username);
      setRoleId(user.role_id);
      setIsActive(user.is_active === 1);
      new PermissionRepository().getAll().then(setAllPermissions);
    }
  }, [visible, user]);

  useEffect(() => {
    if (roleId && visible) {
      new RoleRepository().getPermissions(roleId).then(perms => {
        setRolePermissions(new Set(perms.map(p => p.id)));
      });
      
      if (roleId === user.role_id) {
        new UserPermissionRepository().getOverridesForUser(user.id).then(userPerms => {
          const loadedOverrides: Record<string, 'GRANT' | 'DENY'> = {};
          userPerms.forEach(up => {
            loadedOverrides[up.permission_id] = up.effect;
          });
          setOverrides(loadedOverrides);
        });
      } else {
        // Role changed, decide what to do. The prompt says:
        // "Recommended behavior: KEEP existing overrides only if the user explicitly had custom overrides."
        // Let's just keep the current overrides state in memory unless they reset it.
      }
    }
  }, [roleId, visible, user]);

  const handleOverrideChange = (permissionId: string, effect: 'GRANT' | 'DENY' | 'DEFAULT') => {
    setOverrides(prev => {
      const next = { ...prev };
      if (effect === 'DEFAULT') {
        delete next[permissionId];
      } else {
        next[permissionId] = effect;
      }
      return next;
    });
  };

  const handleResetDefaults = () => {
    setOverrides({});
  };

  const handleSave = async () => {
    if (!name.trim() || !username.trim() || !roleId) {
      Alert.alert('Error', 'Semua field wajib diisi');
      return;
    }
    
    // Protect owner changes
    if (user.role_id === 'owner' && roleId !== 'owner') {
      Alert.alert('Ditolak', 'Tidak dapat mengubah peran akun Owner.');
      return;
    }

    try {
      await userService.update(user.id, {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        role_id: roleId,
        is_active: isActive ? 1 : 0,
      });
      
      if (user.role_id !== 'owner') {
        const userPermRepo = new UserPermissionRepository();
        // Clear all overrides first
        await userPermRepo.clearOverrides(user.id);
        
        // Save new overrides
        for (const [permId, effect] of Object.entries(overrides)) {
          await userPermRepo.setOverride(user.id, permId, effect);
          console.log('[Users][Permissions] SAVE', { userId: user.id, permissionId: permId, effect });
        }
        
        // Read back to verify
        const savedOverrides = await userPermRepo.getOverridesForUser(user.id);
        console.log('[Users][Permissions] DB VERIFY', savedOverrides);
      }

      onSuccess();
    } catch (e: any) {
      console.error('[Users] Failed to mengubah pengguna', e);
      Alert.alert('Error', e.message || 'Gagal mengubah pengguna');
    }
  };

  const handleDelete = async () => {
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

    try {
      setIsDeleting(true);
      console.log('[EditUserModal] Checking historical usage for user:', user.id, user.username);
      const history = await userService.checkHistoricalUsage(user.id);
      console.log('[EditUserModal] Historical usage result:', history);

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
                try {
                  console.log('[EditUserModal] Executing soft deleteUser for:', user.id);
                  const res = await userService.deleteUser(user.id, currentUser?.id);
                  console.log('[EditUserModal] soft deleteUser succeeded:', res);
                  Alert.alert('Sukses', res.message);
                  onSuccess();
                } catch (err: any) {
                  console.error('[EditUserModal] soft deleteUser failed:', {
                    name: err?.name,
                    message: err?.message,
                    stack: err?.stack,
                    code: err?.code,
                  });
                  Alert.alert('Gagal Menghapus', err?.message || 'Terjadi kesalahan saat menghapus pengguna.');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert(
          `Hapus Pengguna: ${user.name}?`,
          `Pengguna @${user.username} belum memiliki riwayat transaksi.\n\nAkun ini akan dihapus secara permanen dari perangkat. Tindakan ini tidak dapat dibatalkan.\n\nApakah Anda yakin ingin menghapus akun ini?`,
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Hapus Permanen',
              style: 'destructive',
              onPress: async () => {
                try {
                  console.log('[EditUserModal] Executing physical deleteUser for:', user.id);
                  const res = await userService.deleteUser(user.id, currentUser?.id);
                  console.log('[EditUserModal] physical deleteUser succeeded:', res);
                  Alert.alert('Sukses', res.message);
                  onSuccess();
                } catch (err: any) {
                  console.error('[EditUserModal] physical deleteUser failed:', {
                    name: err?.name,
                    message: err?.message,
                    stack: err?.stack,
                    code: err?.code,
                  });
                  Alert.alert('Gagal Menghapus', err?.message || 'Terjadi kesalahan saat menghapus pengguna.');
                }
              },
            },
          ]
        );
      }
    } catch (e: any) {
      console.error('[EditUserModal] checkHistoricalUsage failed:', {
        name: e?.name,
        message: e?.message,
        stack: e?.stack,
      });
      Alert.alert('Error', e.message || 'Gagal memeriksa riwayat data pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Ubah Data Pengguna</Text>
              <Text style={{ ...theme.typography.caption, color: colors.textSecondary }}>@{user.username}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {user.role_id !== 'owner' && (
                <TouchableOpacity onPress={handleResetDefaults} style={[styles.resetBtn, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.resetText, { color: colors.primary }]}>Reset Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
                <Icon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Tampilan</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Status Akun</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity 
                style={[
                  styles.roleBtn,
                  {
                    borderColor: isActive ? colors.success : colors.border,
                    backgroundColor: isActive ? colors.success + '20' : colors.surfaceSubtle,
                  },
                  user.role_id === 'owner' && { opacity: 0.5 },
                ]}
                onPress={() => user.role_id !== 'owner' && setIsActive(true)}
              >
                <Text style={[styles.roleText, { color: isActive ? colors.success : colors.textPrimary, fontWeight: isActive ? 'bold' : 'normal' }]}>
                  Aktif
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.roleBtn,
                  {
                    borderColor: !isActive ? colors.error : colors.border,
                    backgroundColor: !isActive ? colors.error + '20' : colors.surfaceSubtle,
                  },
                  user.role_id === 'owner' && { opacity: 0.5 },
                ]}
                onPress={() => user.role_id !== 'owner' && setIsActive(false)}
              >
                <Text style={[styles.roleText, { color: !isActive ? colors.error : colors.textPrimary, fontWeight: !isActive ? 'bold' : 'normal' }]}>
                  Nonaktif
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Peran (Role)</Text>
            <View style={styles.roleContainer}>
              {roles.map(r => {
                const isSelected = roleId === r.id;
                return (
                  <TouchableOpacity 
                    key={r.id} 
                    style={[
                      styles.roleBtn,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primaryLight : colors.surfaceSubtle,
                      },
                      user.role_id === 'owner' && { opacity: 0.5 },
                    ]}
                    onPress={() => {
                      if (user.role_id === 'owner') return;
                      setRoleId(r.id);
                    }}
                    activeOpacity={user.role_id === 'owner' ? 1 : 0.2}
                  >
                    <Text style={[styles.roleText, { color: isSelected ? colors.primary : colors.textPrimary, fontWeight: isSelected ? 'bold' : 'normal' }]}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.permissionSection}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Akses Pengguna (Kustomisasi)</Text>
              <PermissionEditor 
                permissions={allPermissions}
                rolePermissions={rolePermissions}
                overrides={overrides}
                onOverrideChange={handleOverrideChange}
                disabled={user.role_id === 'owner'}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {hasPermission('user.delete') && user.id !== currentUser?.id && user.id !== 'user_owner' && user.username !== 'owner' && (
              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: colors.error }]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                <Text style={[styles.deleteText, { color: colors.error }]}>{isDeleting ? 'Memproses...' : 'Hapus'}</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={[styles.saveText, { color: colors.textInverse }]}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.header3,
  },
  resetBtn: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
  },
  resetText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    flexShrink: 1,
  },
  form: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  label: {
    ...theme.typography.caption,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    ...theme.typography.bodyMedium,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  roleBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
  },
  roleBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  roleText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textPrimary,
  },
  roleTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  permissionSection: {
    marginTop: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cancelBtn: {
    padding: theme.spacing.md,
  },
  cancelText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textMuted,
  },
  saveBtn: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  saveText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textInverse,
    fontWeight: 'bold',
  },
  deleteBtn: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
});
