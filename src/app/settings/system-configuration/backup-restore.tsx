import React, { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, Alert, ScrollView, Modal, TextInput, BackHandler } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { backupService, BackupData } from '@/services/backup/BackupService';
import { useAuth } from '@/context/AuthContext';
import { theme, useTheme } from '@/theme';

export default function BackupRestoreScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission } = useAuth();
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [confirmationPin, setConfirmationPin] = useState('');
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings/system-configuration');
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
          <SectionHeader title="Cadangkan & Pulihkan" subtitle="Cadangan database lengkap" onBack={handleBack} />
          <View style={styles.deniedContainer}>
            <Text style={[styles.deniedTitle, { color: colors.error }]}>Akses Ditolak</Text>
            <Text style={[styles.deniedSubtitle, { color: colors.textSecondary }]}>
              Anda tidak memiliki izin untuk mengakses menu Cadangkan & Pulihkan.
            </Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }

  const handleSaveToDevice = async () => {
    setBackupLoading(true);
    try {
      const result = await backupService.saveBackupToDevice();
      if (result.cancelled) {
        return;
      }
      if (result.success) {
        Alert.alert(
          'Backup Disimpan',
          `File backup berhasil disimpan ke perangkat:\n\nNama File: ${result.fileName || 'backup.json'}\n\nLokasi: Folder yang Anda pilih (misal: Download).`
        );
      } else {
        Alert.alert('Gagal Menyimpan', result.message || 'Gagal menyimpan backup ke perangkat.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleShareBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await backupService.createBackup();
      if (!result.success || !result.filePath) {
        Alert.alert('Gagal', result.message || 'Gagal membuat backup.');
        return;
      }
      const shared = await backupService.shareBackup(result.filePath);
      if (!shared) {
        Alert.alert('Backup Dibuat', `File backup tersimpan di penyimpanan aplikasi: ${result.filePath}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Terjadi kesalahan saat membagikan backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    try {
      const pickResult = await backupService.pickBackupFile();
      if (!pickResult.success || !pickResult.uri) return;

      setRestoreLoading(true);
      const valResult = await backupService.validateBackup(pickResult.uri);
      
      if (!valResult.success || !valResult.backup) {
        setRestoreLoading(false);
        Alert.alert('File Tidak Valid', valResult.message || 'File backup tidak dapat dibaca.');
        return;
      }

      const meta = valResult.backup.metadata;
      if (meta.archiveType === 'transaction_archive') {
        setRestoreLoading(false);
        Alert.alert('Salah Format', 'Gunakan menu Arsip Transaksi untuk memulihkan arsip transaksi.');
        return;
      }

      setRestoreLoading(false);

      const previewMsg = `File: ${pickResult.name || 'backup.json'}
Dibuat: ${new Date(meta.createdAt).toLocaleString('id-ID')}
Produk: ${meta.counts.products}
Transaksi: ${meta.counts.transactions}${meta.counts.userPermissions !== undefined ? `\nOverride Hak Akses: ${meta.counts.userPermissions}` : ''}${meta.counts.draftSales !== undefined ? `\nDraft Transaksi: ${meta.counts.draftSales}` : ''}
Versi Format: ${meta.formatVersion}

PERINGATAN KEAMANAN: Data lokal saat ini akan diganti seluruhnya. Diperlukan verifikasi PIN untuk melanjutkan.`;

      Alert.alert('Konfirmasi Restore Full Backup', previewMsg, [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Lanjutkan', 
          style: 'destructive',
          onPress: () => {
            setPendingBackup(valResult.backup!);
            setConfirmationPin('');
            setPinModalVisible(true);
          }
        }
      ]);
    } catch (error: any) {
      setRestoreLoading(false);
      Alert.alert('Error', error.message || 'Terjadi kesalahan saat memvalidasi backup.');
    }
  };

  const executeRestoreWithPin = async () => {
    if (!confirmationPin) {
      Alert.alert('Error', 'PIN konfirmasi wajib diisi.');
      return;
    }
    setPinModalVisible(false);
    setRestoreLoading(true);
    try {
      const res = await backupService.restoreBackup(pendingBackup!, { confirmationPin });
      if (res.success) {
        Alert.alert('Sukses', 'Data berhasil dipulihkan dari backup. Silakan restart aplikasi.');
      } else {
        Alert.alert('Gagal Restore', res.message || 'Gagal memulihkan backup.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setRestoreLoading(false);
      setConfirmationPin('');
      setPendingBackup(null);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Cadangkan & Pulihkan"
            subtitle="Cadangkan dan pulihkan seluruh basis data sistem secara aman"
            onBack={handleBack}
          />
          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Ekspor Cadangan Lengkap</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Cadangan ini mencakup seluruh master data (Produk, Pelanggan, User) serta riwayat Transaksi. Simpan salinan ke folder perangkat (misal: Download) atau bagikan ke media penyimpanan lain.
            </Text>
            <View style={{ gap: theme.spacing.sm }}>
              <Button title="Simpan ke Folder Perangkat" onPress={handleSaveToDevice} loading={backupLoading} variant="primary" />
              <Button title="Bagikan Berkas Cadangan" variant="outline" onPress={handleShareBackup} disabled={backupLoading} />
            </View>
          </Card>

          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Pulihkan Cadangan Lengkap</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Kembalikan semua data toko dari berkas cadangan (.json). PERINGATAN: Semua data yang ada di aplikasi saat ini akan ditimpa dan diganti secara penuh.
            </Text>
            <Button title="Pilih File & Pulihkan" onPress={handleRestoreBackup} variant="outline" loading={restoreLoading} disabled={backupLoading} />
          </Card>
        </ResponsiveContainer>
      </ScrollView>

      {/* Owner PIN Re-Verification Modal */}
      <Modal
        visible={pinModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setPinModalVisible(false);
          setPendingBackup(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Verifikasi PIN</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Masukkan PIN Anda untuk mengonfirmasi operasi pemulihan database.
            </Text>
            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                },
              ]}
              value={confirmationPin}
              onChangeText={setConfirmationPin}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button
                title="Batal"
                variant="outline"
                onPress={() => {
                  setPinModalVisible(false);
                  setConfirmationPin('');
                  setPendingBackup(null);
                }}
                style={{ flex: 1 }}
              />
              <Button
                title="Verifikasi & Restore"
                variant="primary"
                onPress={executeRestoreWithPin}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: theme.spacing.lg, marginBottom: theme.spacing.lg },
  title: { ...theme.typography.header3, marginBottom: theme.spacing.xs },
  desc: { ...theme.typography.bodySmall, marginBottom: theme.spacing.md },
  deniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  deniedTitle: { ...theme.typography.header2, marginBottom: theme.spacing.xs },
  deniedSubtitle: { ...theme.typography.bodyMedium, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    borderWidth: 1,
  },
  modalTitle: {
    ...theme.typography.header3,
    marginBottom: theme.spacing.xs,
  },
  modalSubtitle: {
    ...theme.typography.bodySmall,
    marginBottom: theme.spacing.lg,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
});
