import React, { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { View, Text, StyleSheet, Alert, ScrollView, TextInput, BackHandler } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { runDatabaseVerification, VerificationResult } from '@/database/verification';
import { getDatabase, withTransaction } from '@/database/database';
import { seedDatabase } from '@/database/seed';
import { runDemoSeed } from '@/database/seed/demo/seedDemoData';
import { theme, useTheme } from '@/theme';

export default function DatabaseMaintenanceScreen() {
  const { colors, isDark } = useTheme();
  const [verifying, setVerifying] = useState(false);
  const [verifResults, setVerifResults] = useState<VerificationResult[] | null>(null);
  const [resetting, setResetting] = useState(false);
  const [generatingDemo, setGeneratingDemo] = useState(false);
  const [resetInput, setResetInput] = useState('');

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

  const handleGenerateDemo = () => {
    Alert.alert(
      'Buat Data Demo?',
      'Tindakan ini akan menambahkan data contoh ke database toko saat ini untuk keperluan pengujian dan demonstrasi.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Buat Data Demo',
          onPress: async () => {
            setGeneratingDemo(true);
            try {
              const res = await runDemoSeed();
              if (res.success) {
                Alert.alert('Sukses', res.message);
              } else {
                Alert.alert('Info', res.message);
              }
            } catch (err: any) {
              Alert.alert('Gagal', err.message);
            } finally {
              setGeneratingDemo(false);
            }
          }
        }
      ]
    );
  };


  const handleRunVerification = async () => {
    setVerifying(true);
    try {
      const results = await runDatabaseVerification();
      setVerifResults(results);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleFactoryReset = () => {
    Alert.alert(
      'FACTORY RESET',
      'PERINGATAN: Tindakan ini akan MENGHAPUS SEMUA DATA dari perangkat ini, termasuk master data produk, pelanggan, pengaturan, dan transaksi.\n\nTindakan ini tidak dapat dibatalkan. Apakah Anda sangat yakin?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'YA, HAPUS SEMUA',
          style: 'destructive',
          onPress: async () => {
            
            setResetting(true);
            try {
              const db = await getDatabase();
              await withTransaction(async (dbClient) => {
                const tables = ['draft_sale_items', 'draft_sales', 'transaction_items', 'payments', 'stock_movements', 'transactions', 'expenses', 'products', 'categories', 'customers', 'role_permissions', 'users', 'permissions', 'roles', 'settings'];
                for (const table of tables) {
                  await dbClient.runAsync(`DELETE FROM ${table};`);
                }
                
              });
              
              // Re-initialize default required data outside the delete transaction
              await seedDatabase(db);
              
              // Remove logo files
              if (FileSystem.documentDirectory) {
                const dir = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
                for (const file of dir) {
                  if (file.startsWith('store_logo_')) {
                    await FileSystem.deleteAsync(FileSystem.documentDirectory + file, { idempotent: true });
                  }
                }
              }
              
              setResetInput('');
              Alert.alert('Sukses', 'Semua data telah direset ke setelan awal pabrik.');
            } catch (err: any) {
              Alert.alert('Gagal Reset', err.message);
            } finally {
              setResetting(false);
            }

          }
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Pemeliharaan Database"
            subtitle="Verifikasi integritas database, data demo, dan pemeliharaan sistem"
            onBack={handleBack}
          />
          
          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Status Basis Data</Text>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Mesin Database</Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>expo-sqlite (SQLite 3)</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Arsitektur</Text>
              <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Lokal Offline-First</Text>
            </View>
            <View style={{ marginTop: theme.spacing.md }}>
              <Button
                title={verifying ? 'Memverifikasi...' : 'Verifikasi Integritas Database'}
                onPress={handleRunVerification}
                variant="outline"
                loading={verifying}
              />
              {verifResults && verifResults.length > 0 && (
                <View style={[styles.verifResultsBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                  <Text style={[styles.verifHeader, { color: colors.textPrimary }]}>
                    Hasil Verifikasi ({verifResults.filter((r) => r.passed).length}/{verifResults.length} Lolos)
                  </Text>
                  {verifResults.map((r) => (
                    <View key={r.step} style={styles.verifItem}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Icon
                          name={r.passed ? 'check' : 'alert'}
                          size={14}
                          color={r.passed ? colors.success : colors.error}
                        />
                        <Text style={[styles.verifStatus, { color: r.passed ? colors.success : colors.error }]}>
                          Langkah {r.step}
                        </Text>
                      </View>
                      <Text style={[styles.verifMsg, { color: colors.textSecondary }]}>{r.message}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Card>

          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Buat Data Demo</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Isi basis data dengan contoh produk, kategori, dan transaksi untuk keperluan uji coba dan demonstrasi kasir.
            </Text>
            <Button title="Buat Data Demo" onPress={handleGenerateDemo} variant="outline" loading={generatingDemo} />
          </Card>

          <Card variant="standard" style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.error + '40' }]}>
            <Text style={[styles.title, { color: colors.error }]}>Reset Database (Pabrik)</Text>
            <Text style={[styles.desc, { color: colors.textSecondary }]}>
              Hapus seluruh transaksi, pengeluaran, dan master data toko, lalu kembalikan ke konfigurasi awal bawaan. Tindakan ini tidak dapat dibatalkan!
            </Text>
            
            <View style={{ marginBottom: theme.spacing.md }}>
              <Text style={{ ...theme.typography.caption, marginBottom: theme.spacing.xs, fontWeight: 'bold', color: colors.textSecondary }}>
                Ketik "RESET" untuk membuka konfirmasi:
              </Text>
              <TextInput
                style={[
                  styles.resetTextInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.error,
                    color: colors.textPrimary,
                  },
                ]}
                value={resetInput}
                onChangeText={setResetInput}
                placeholder="RESET"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
            </View>

            <Button
              title="Reset ke Setelan Pabrik"
              variant="danger"
              onPress={handleFactoryReset}
              loading={resetting}
              disabled={resetInput !== 'RESET'}
            />
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
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.xs },
  settingLabel: { ...theme.typography.bodySmall, fontWeight: '600' },
  settingValue: { ...theme.typography.bodySmall },
  verifResultsBox: { marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1 },
  verifHeader: { ...theme.typography.caption, fontWeight: '700', marginBottom: theme.spacing.xs },
  verifItem: { marginBottom: 6 },
  verifStatus: { ...theme.typography.caption, fontWeight: '600' },
  verifMsg: { ...theme.typography.caption, marginLeft: 20 },
  resetTextInput: { borderWidth: 1, borderRadius: theme.radius.sm, padding: theme.spacing.md, ...theme.typography.bodyMedium },
});
