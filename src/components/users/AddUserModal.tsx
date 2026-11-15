import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { theme, useTheme } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { RoleEntity } from '@/database/types';
import { userService } from '@/services/user/UserService';
import { authService } from '@/services/auth/AuthService';

interface AddUserModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  roles: RoleEntity[];
}

export function AddUserModal({ visible, onClose, onSuccess, roles }: AddUserModalProps) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [roleId, setRoleId] = useState(roles.length > 0 ? roles[0].id : '');
  
  const handleSave = async () => {
    if (!name.trim() || !username.trim() || !pin || !roleId) {
      Alert.alert('Error', 'Semua field wajib diisi');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PIN dan Konfirmasi PIN tidak sama');
      return;
    }
    
    try {
      console.log('[Users] ADD SUBMIT', { name, username, roleId });
      
      await userService.assertPinUnique(pin);
      const newUser = await userService.createUser({
        id: 'usr_' + Date.now(),
        name: name.trim(),
        username: username.trim().toLowerCase(),
        pin,
        role_id: roleId,
        is_active: 1
      });

      const { pin_hash: _ignored, ...safeUser } = newUser;
      console.log('[Users] CREATE SUCCESS', safeUser);
      
      setName('');
      setUsername('');
      setPin('');
      setConfirmPin('');
      onSuccess();
    } catch (e: any) {
      console.error('[Users] CREATE FAILED', e);
      Alert.alert('Error', e.message || 'Gagal menyimpan pengguna');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Tambah Pengguna Baru</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Nama Tampilan</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="contoh: Budi Santoso"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Username</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="budi"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>PIN (4-6 Angka)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={pin}
              onChangeText={setPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Konfirmasi PIN</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={confirmPin}
              onChangeText={setConfirmPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Peran (Role)</Text>
            <View style={styles.roleContainer}>
              {roles.map(r => {
                const isActive = roleId === r.id;
                return (
                  <TouchableOpacity 
                    key={r.id} 
                    style={[
                      styles.roleBtn,
                      {
                        borderColor: isActive ? colors.primary : colors.border,
                        backgroundColor: isActive ? colors.primaryLight : colors.surfaceSubtle,
                      },
                    ]}
                    onPress={() => setRoleId(r.id)}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        {
                          color: isActive ? colors.primary : colors.textPrimary,
                          fontWeight: isActive ? 'bold' : 'normal',
                        },
                      ]}
                    >
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={[styles.saveText, { color: colors.textInverse }]}>Buat Pengguna</Text>
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
    padding: theme.spacing.lg,
    borderRadius: theme.radius.lg,
    width: '92%',
    maxWidth: 480,
    maxHeight: '90%',
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.header3,
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
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
  },
  label: {
    ...theme.typography.caption,
    fontWeight: 'bold',
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    ...theme.typography.bodyMedium,
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  roleBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
  },
  roleText: {
    ...theme.typography.bodyMedium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cancelBtn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  cancelText: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.sm,
  },
  saveText: {
    ...theme.typography.bodyMedium,
    fontWeight: 'bold',
  },
});
