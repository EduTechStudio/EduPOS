import React, { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, Alert, ScrollView, TextInput, BackHandler } from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { backupService } from '@/services/backup/BackupService';
import { getDatabase } from '@/database/database';
import { formatCurrency } from '@/utils/currency';
import { theme, useTheme } from '@/theme';
import { useAuth } from '@/context/AuthContext';

export default function TransactionArchiveScreen() {
  const { colors, isDark } = useTheme();
  const { hasPermission } = useAuth();
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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
          <SectionHeader title="Arsip Transaksi" subtitle="Arsipkan dan bersihkan riwayat transaksi penjualan" onBack={handleBack} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.error, marginBottom: 8 }}>
              Akses Ditolak
            </Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Anda tidak memiliki izin untuk mengakses Arsip Transaksi.
            </Text>
          </View>
        </ResponsiveContainer>
      </ScreenContainer>
    );
  }
  
  const [summary, setSummary] = useState<{ count: number, totalSales: number } | null>(null);
  const [counting, setCounting] = useState(false);
  
  const [archiveFile, setArchiveFile] = useState<{ uri: string, count: number } | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handlePreview = async () => {
    setCounting(true);
    setArchiveFile(null);
    try {
      const db = await getDatabase();
      const s = startDate.trim();
      const e = endDate.trim();
      const dateStart = s.substring(0, 10);
      const dateEnd = e.substring(0, 10);
      const isoStart = s.includes('T') ? s : `${dateStart}T00:00:00.000Z`;
      const isoEnd = e.includes('T') ? e : `${dateEnd}T23:59:59.999Z`;

      const res = await db.getAllAsync(
        `SELECT COUNT(id) as count, SUM(total_amount) as total FROM transactions 
         WHERE (created_at >= ? AND created_at <= ?) OR (date(created_at) >= date(?) AND date(created_at) <= date(?));`,
        [isoStart, isoEnd, dateStart, dateEnd]
      );
      const count = (res as any[])[0]?.count || 0;
      const totalSales = (res as any[])[0]?.total || 0;
      setSummary({ count, totalSales });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCounting(false);
    }
  };

  const handleCreateArchive = async () => {
    setArchiving(true);
    try {
      const result = await backupService.createTransactionArchive(startDate, endDate);
      if (result.success && result.filePath && result.metadata) {
        setArchiveFile({ uri: result.filePath, count: result.metadata.counts.transactions });
        Alert.alert(
          'Archive Berhasil Dibuat',
          `Berhasil mengekspor ${result.metadata.counts.transactions} transaksi ke file archive.\n\nPerhatian: Transaksi masih tersimpan di database aktif perangkat sampai Anda menekan tombol 'Archive & Remove Transaksi' di bawah.`
        );
      } else {
        Alert.alert('Gagal', result.message || 'Gagal membuat archive.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setArchiving(false);
    }
  };

  const handleShareArchive = async () => {
    if (!archiveFile) return;
    await backupService.shareBackup(archiveFile.uri);
  };

  const handleSaveArchiveToDevice = async () => {
    if (!archiveFile) return;
    try {
      const res = await backupService.saveBackupToDevice(archiveFile.uri);
      if (res.cancelled) return;
      if (res.success) {
        Alert.alert(
          'Archive Disimpan',
          `File archive berhasil disimpan ke perangkat:\n\nNama File: ${res.fileName || 'archive.storebackup'}\n\nLokasi: Folder yang Anda pilih (misal: Download).`
        );
      } else {
        Alert.alert('Gagal Menyimpan', res.message || 'Gagal menyimpan file archive ke perangkat.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveTransactions = () => {
    if (!archiveFile) return;
    Alert.alert(
      'Hapus Transaksi Permanen?',
      `Tindakan ini akan menghapus ${archiveFile.count} transaksi beserta item, stok, dan pembayarannya dari perangkat ini untuk periode: \n${startDate} s/d ${endDate}.\n\nMaster data (Produk, Pelanggan, dll) TIDAK akan dihapus.\n\nPastikan Anda sudah menyimpan file Archive di tempat yang aman. Safety snapshot otomatis akan dibuat sebelum penghapusan.`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus Transaksi', 
          style: 'destructive',
          onPress: async () => {
            setRemoving(true);
            const res = await backupService.removeArchivedTransactions(startDate, endDate);
            setRemoving(false);
            if (res.success) {
              setSummary(null);
              setArchiveFile(null);
              Alert.alert('Sukses', res.message || 'Transaksi berhasil dihapus dari perangkat.');
            } else {
              Alert.alert('Gagal', res.message || 'Gagal menghapus transaksi.');
            }
          }
        }
      ]
    );
  };

  const handleRestoreArchive = async () => {
    try {
      const pickResult = await backupService.pickBackupFile();
      if (!pickResult.success || !pickResult.uri) return;

      setRestoring(true);
      const valResult = await backupService.validateBackup(pickResult.uri);
      
      if (!valResult.success || !valResult.backup) {
        setRestoring(false);
        Alert.alert('File Tidak Valid', valResult.message || 'File archive tidak dapat dibaca.');
        return;
      }

      const meta = valResult.backup.metadata;
      if (meta.archiveType !== 'transaction_archive') {
        setRestoring(false);
        Alert.alert('Salah Format', 'File ini adalah Full Backup. Silakan gunakan menu Backup & Restore.');
        return;
      }

      const previewMsg = `Archive Type: Transaction Archive
Periode: ${meta.periodStart?.substring(0, 10)} s/d ${meta.periodEnd?.substring(0, 10)}
Transaksi: ${meta.counts.transactions}

PENTING: Transaksi akan ditambahkan ke database tanpa menghapus data master. Jika ada ID transaksi yang duplikat, proses akan dibatalkan.`;

      Alert.alert('Konfirmasi Restore Archive', previewMsg, [
        { text: 'Batal', style: 'cancel', onPress: () => setRestoring(false) },
        { 
          text: 'Restore Transaksi', 
          onPress: async () => {
            setRestoring(true);
            const res = await backupService.restoreTransactionArchive(valResult.backup!);
            setRestoring(false);
            if (res.success) {
              Alert.alert('Sukses', 'Transaksi berhasil dipulihkan.');
            } else {
              Alert.alert('Gagal Restore', res.message || 'Terdapat duplikasi atau kesalahan.');
            }
          }
        }
      ]);
    } catch (error: any) {
      setRestoring(false);
      Alert.alert('Error', error.message || 'Terjadi kesalahan saat restore archive.');
    }
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Arsip Transaksi"
            subtitle="Arsipkan dan bersihkan riwayat transaksi penjualan"
            onBack={handleBack}
          />
          
          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Buat Arsip Baru</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Pilih rentang tanggal transaksi yang ingin diarsipkan. Format: YYYY-MM-DD.
            </Text>
            
            <View style={styles.row}>
              <View style={styles.inputBox}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Tanggal Mulai</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.inputBox}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Tanggal Akhir</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <Button title={counting ? "Menghitung..." : "Pratinjau Transaksi"} onPress={handlePreview} loading={counting} variant="outline" />

            {summary !== null && (
              <View style={[styles.summaryBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>Pratinjau Periode Terpilih</Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Total Transaksi: <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>{summary.count}</Text></Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Total Penjualan: <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{formatCurrency(summary.totalSales)}</Text></Text>
                
                {summary.count > 0 && !archiveFile && (
                  <Button title={archiving ? "Membuat Arsip..." : "Buat Berkas Arsip"} onPress={handleCreateArchive} loading={archiving} style={{ marginTop: 12 }} variant="primary" />
                )}
                {summary.count === 0 && (
                  <Text style={[styles.summaryText, { color: colors.error, marginTop: 10 }]}>Tidak ada transaksi pada periode ini.</Text>
                )}
              </View>
            )}

            {archiveFile && (
              <View style={[styles.archiveBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Text style={[styles.summaryTitle, { color: colors.primary }]}>✓ Berkas Arsip Berhasil Dibuat</Text>
                <Text style={[styles.summaryText, { color: colors.textPrimary }]}>Silakan simpan file sebelum membersihkan transaksi dari perangkat.</Text>
                
                <View style={{ gap: 8, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button title="Simpan ke Perangkat" onPress={handleSaveArchiveToDevice} style={{ flex: 1 }} variant="primary" />
                    <Button title="Bagikan Arsip" variant="outline" onPress={handleShareArchive} style={{ flex: 1 }} />
                  </View>
                  <Button title="Arsipkan & Bersihkan Transaksi" variant="danger" onPress={handleRemoveTransactions} loading={removing} />
                </View>
              </View>
            )}
          </Card>

          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Pulihkan Arsip Transaksi</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Impor kembali berkas arsip (.storebackup) untuk memulihkan riwayat transaksi tanpa mengganggu master data (produk, kategori, dll).
            </Text>
            <Button title="Pilih File & Impor Arsip" onPress={handleRestoreArchive} variant="outline" loading={restoring} />
          </Card>

        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { padding: theme.spacing.lg, marginBottom: theme.spacing.lg },
  title: { ...theme.typography.header3, marginBottom: theme.spacing.xs },
  desc: { ...theme.typography.bodySmall, marginBottom: theme.spacing.md },
  row: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  inputBox: { flex: 1 },
  label: { ...theme.typography.caption, fontWeight: 'bold', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: theme.radius.sm, padding: 10, ...theme.typography.bodyMedium },
  summaryBox: { marginTop: 15, padding: 15, borderRadius: theme.radius.md },
  summaryTitle: { ...theme.typography.bodyMedium, fontWeight: 'bold', marginBottom: 8 },
  summaryText: { ...theme.typography.bodySmall, marginBottom: 4 },
  archiveBox: { marginTop: 15, padding: 15, borderRadius: theme.radius.md, borderWidth: 1 },
});
