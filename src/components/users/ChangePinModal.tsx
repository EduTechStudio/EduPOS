import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { theme, useTheme } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { UserEntity } from '@/database/types';
import { userService } from '@/services/user/UserService';

interface ChangePinModalProps {
  visible: boolean;
  user: UserEntity;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangePinModal({ visible, user, onClose, onSuccess }: ChangePinModalProps) {
  const { colors, isDark } = useTheme();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    if (visible) {
      setNewPin('');
      setConfirmPin('');
    }
  }, [visible]);

  const handleSave = async () => {
    if (!newPin || !confirmPin) {
      Alert.alert('Error', 'Semua field wajib diisi');
      return;
    }
    
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'Konfirmasi PIN tidak cocok');
      return;
    }

    try {
      await userService.changePin(user.id, newPin);

      Alert.alert('Sukses', 'PIN berhasil diubah');
      onSuccess();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal mengubah PIN');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Ubah PIN Pengguna</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Akun @{user.username} ({user.name})</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle }]}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>PIN Baru (4-6 Angka)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={newPin}
              onChangeText={setNewPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Konfirmasi PIN Baru</Text>
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
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={[styles.saveText, { color: colors.textInverse }]}>Simpan PIN</Text>
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
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    width: '90%',
    maxWidth: 420,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.header3,
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  form: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.xl,
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
