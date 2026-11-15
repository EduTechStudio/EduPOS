import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { theme, useTheme } from '@/theme';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditProfileModal({ visible, onClose, onSuccess }: EditProfileModalProps) {
  const { colors, isDark } = useTheme();
  const { currentUser, currentRole, updateSelfProfile } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setErrorMessage(null);
    }
  }, [visible, currentUser]);

  const handleSave = async () => {
    setErrorMessage(null);
    const trimmedName = name.trim();
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedName) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }

    if (!trimmedUsername) {
      setErrorMessage('Username wajib diisi.');
      return;
    }

    if (trimmedUsername.length < 3) {
      setErrorMessage('Username minimal 3 karakter.');
      return;
    }

    if (!/^[a-z0-9_.-]+$/.test(trimmedUsername)) {
      setErrorMessage('Username hanya boleh berisi huruf kecil, angka, titik, strip, dan garis bawah.');
      return;
    }

    setSaving(true);
    try {
      await updateSelfProfile({
        name: trimmedName,
        username: trimmedUsername,
      });

      Alert.alert('Sukses', 'Profil Anda berhasil diperbarui.');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Profil Saya</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Perbarui nama dan username akun yang sedang digunakan
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Tutup dialog"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorSoft, borderColor: colors.error }]}>
                <Icon name="alert" size={16} color={colors.error} style={{ marginRight: 6 }} />
                <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Readonly Account Identity */}
            <View style={[styles.infoBanner, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primarySoft }]}>
                <Icon name="user" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                <Text style={[styles.infoRoleLabel, { color: colors.textSecondary }]}>Peran Pengguna</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Badge label={currentRole?.name || 'Staff'} variant="info" />
                </View>
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Nama Lengkap *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                editable={!saving}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Username *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                  },
                ]}
                value={username}
                onChangeText={(val) => {
                  setUsername(val.toLowerCase());
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Contoh: budi_kasir"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
              />
              <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
                Gunakan huruf kecil, angka, atau tanda titik/garis bawah tanpa spasi.
              </Text>
            </View>

            <View style={[styles.securityNotice, { backgroundColor: colors.surfaceSubtle }]}>
              <Icon name="security" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.securityText, { color: colors.textMuted }]}>
                Peran dan hak akses akun dikelola secara terpusat oleh pemilik toko.
              </Text>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button
              title="Batal"
              variant="secondary"
              size="md"
              onPress={onClose}
              disabled={saving}
              style={{ flex: 1 }}
            />
            <Button
              title={saving ? 'Menyimpan...' : 'Simpan Profil'}
              variant="primary"
              size="md"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    ...theme.typography.header3,
    fontWeight: '700',
  },
  subtitle: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  closeBtn: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  body: {
    padding: theme.spacing.lg,
    maxHeight: 400,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    ...theme.typography.caption,
    fontWeight: '600',
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRoleLabel: {
    ...theme.typography.caption,
    fontSize: 11,
  },
  fieldGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    ...theme.typography.bodyMedium,
  },
  fieldHint: {
    ...theme.typography.caption,
    fontSize: 11,
    marginTop: 4,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  securityText: {
    ...theme.typography.caption,
    fontSize: 11,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
  },
});
