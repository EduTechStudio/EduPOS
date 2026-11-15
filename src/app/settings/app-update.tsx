import React, { useState, useEffect, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { SectionHeader } from '@/components/layout/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { updateService } from '@/services/update';
import { UPDATE_CONFIG } from '@/config/updateConfig';
import {
  UpdateCheckResult,
  DownloadState,
  DownloadProgress,
} from '@/types/update';
import { theme, useTheme } from '@/theme';

export default function AppUpdateScreen() {
  const { colors, isDark } = useTheme();

  const currentInfo = updateService.getCurrentVersion();

  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);

  const [downloadState, setDownloadState] = useState<DownloadState>('IDLE');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    totalBytes: 0,
    bytesWritten: 0,
    progress: 0,
  });
  const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [customManifestUrl, setCustomManifestUrl] = useState<string>(UPDATE_CONFIG.MANIFEST_URL);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);

  const handleBack = useCallback(() => {
    if (downloadState === 'DOWNLOADING') {
      Alert.alert(
        'Pengunduhan Berjalan',
        'Pengunduhan pembaruan sedang berlangsung. Apakah Anda yakin ingin membatalkan dan kembali?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Ya, Batalkan',
            style: 'destructive',
            onPress: async () => {
              await updateService.cancelDownload();
              router.back();
            },
          },
        ]
      );
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings');
    }
  }, [downloadState]);

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

  const handleCheckUpdate = async () => {
    setChecking(true);
    setDownloadState('IDLE');
    setDownloadedFileUri(null);
    setDownloadError(null);

    try {
      const result = await updateService.checkUpdate(customManifestUrl || undefined);
      setCheckResult(result);
    } catch (err: any) {
      setCheckResult({
        status: 'NETWORK_ERROR',
        currentVersion: currentInfo.version,
        currentVersionCode: currentInfo.versionCode,
        message: err?.message || 'Terjadi kesalahan saat memeriksa pembaruan.',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setChecking(false);
    }
  };

  const handleStartDownload = async () => {
    if (!checkResult?.manifest) return;

    setDownloadState('DOWNLOADING');
    setDownloadError(null);
    setDownloadProgress({ totalBytes: 0, bytesWritten: 0, progress: 0 });

    try {
      const result = await updateService.downloadUpdate(
        checkResult.manifest,
        (progress) => {
          setDownloadProgress(progress);
        }
      );

      setDownloadState('READY_TO_INSTALL');
      setDownloadedFileUri(result.fileUri);
      Alert.alert(
        'Unduhan Selesai & Terverifikasi',
        'Berkas APK pembaruan berhasil diunduh dan lolos verifikasi integritas SHA-256. Tekan "Pasang Pembaruan" untuk melanjutkan.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      if (downloadState !== 'CANCELLED') {
        setDownloadState('ERROR');
        setDownloadError(error?.message || 'Gagal mengunduh atau memverifikasi berkas pembaruan.');
      }
    }
  };

  const handleCancelDownload = async () => {
    await updateService.cancelDownload();
    setDownloadState('CANCELLED');
    setDownloadProgress({ totalBytes: 0, bytesWritten: 0, progress: 0 });
  };

  const handleInstall = async () => {
    if (!downloadedFileUri) return;

    try {
      await updateService.installUpdate(downloadedFileUri);
    } catch (error: any) {
      Alert.alert(
        'Gagal Membuka Penginstal Paket',
        error?.message ||
          'Sistem Android gagal membuka berkas pembaruan. Pastikan izin "Izinkan dari sumber ini" telah diberikan.',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Buka Pengaturan Izin',
            onPress: () => updateService.openUnknownAppSourcesSettings(),
          },
        ]
      );
    }
  };

  const renderStatusBadge = () => {
    if (checking) {
      return <Badge label="Memeriksa..." variant="info" />;
    }
    if (!checkResult) {
      return <Badge label="Belum Diperiksa" variant="default" />;
    }

    switch (checkResult.status) {
      case 'UPDATE_AVAILABLE':
        return <Badge label="Pembaruan Tersedia" variant="warning" />;
      case 'UP_TO_DATE':
        return <Badge label="Versi Terbaru" variant="success" />;
      case 'CONFIGURATION_ERROR':
        return <Badge label="Konfigurasi URL Diperlukan" variant="warning" />;
      case 'NETWORK_ERROR':
        return <Badge label="Koneksi Bermasalah" variant="error" />;
      case 'INVALID_METADATA':
      case 'STALE_METADATA':
        return <Badge label="Metadata Tidak Valid" variant="error" />;
      default:
        return <Badge label="Status Tidak Diketahui" variant="default" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Ukuran tidak diketahui';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ResponsiveContainer>
          <SectionHeader
            title="Pembaruan Aplikasi"
            subtitle="Pusat distribusi dan pembaruan versi mandiri"
            onBack={handleBack}
          />

          {/* 1. Installed App Identity Card */}
          <Card variant="standard" style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primarySoft }]}>
                <Icon name="info" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderMeta}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Versi Terpasang</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Identitas rilis instalasi pada perangkat ini
                </Text>
              </View>
              <Badge label="Stabil" variant="success" />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.specGrid}>
              <View style={styles.specItem}>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Versi Aplikasi</Text>
                <Text style={[styles.specValue, { color: colors.textPrimary }]}>v{currentInfo.version}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Kode Build (versionCode)</Text>
                <Text style={[styles.specValue, { color: colors.primary }]}>{currentInfo.versionCode}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>ID Paket Android</Text>
                <Text style={[styles.specValueCode, { color: colors.textPrimary }]}>{currentInfo.packageId}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={[styles.specLabel, { color: colors.textSecondary }]}>Kanal Distribusi</Text>
                <Text style={[styles.specValue, { color: colors.textPrimary }]}>Internal APK Release</Text>
              </View>
            </View>
          </Card>

          {/* 2. Check for Updates Card */}
          <Card variant="standard" style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primarySoft }]}>
                <Icon name="refresh" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderMeta}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Pemeriksaan Pembaruan</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {checkResult?.checkedAt
                    ? `Terakhir diperiksa: ${new Date(checkResult.checkedAt).toLocaleTimeString('id-ID')}`
                    : 'Tekan tombol untuk memverifikasi versi terbaru'}
                </Text>
              </View>
              {renderStatusBadge()}
            </View>

            {checkResult?.message && (
              <View
                style={[
                  styles.messageBox,
                  {
                    backgroundColor:
                      checkResult.status === 'UP_TO_DATE'
                        ? colors.successLight || '#EBFBF2'
                        : checkResult.status === 'UPDATE_AVAILABLE'
                        ? colors.accentLight || '#FEF5EB'
                        : colors.surfaceSubtle,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    {
                      color:
                        checkResult.status === 'UP_TO_DATE'
                          ? colors.success
                          : checkResult.status === 'UPDATE_AVAILABLE'
                          ? colors.accent
                          : colors.textPrimary,
                    },
                  ]}
                >
                  {checkResult.message}
                </Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <Button
                title={checking ? 'Memeriksa...' : 'Periksa Pembaruan'}
                variant="primary"
                onPress={handleCheckUpdate}
                disabled={checking || downloadState === 'DOWNLOADING'}
                leftIcon={
                  checking ? (
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  ) : (
                    <Icon name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
                  )
                }
              />

              <Button
                title={showConfigDrawer ? 'Tutup Pengaturan URL' : 'Atur URL Manifest'}
                variant="outline"
                size="sm"
                onPress={() => setShowConfigDrawer(!showConfigDrawer)}
                style={{ marginLeft: theme.spacing.sm }}
              />
            </View>

            {/* Config URL Drawer for testers */}
            {showConfigDrawer && (
              <View style={[styles.configDrawer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.configDrawerTitle, { color: colors.textPrimary }]}>
                  Konfigurasi URL Manifest Pembaruan (Pengujian / Server)
                </Text>
                <Text style={[styles.configDrawerDesc, { color: colors.textSecondary }]}>
                  Tentukan URL HTTPS yang menyajikan berkas metadata version.json.
                </Text>
                <TextInput
                  style={[styles.urlInput, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="https://example.com/version.json"
                  placeholderTextColor={colors.textMuted}
                  value={customManifestUrl}
                  onChangeText={setCustomManifestUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <Button
                  title="Simpan & Gunakan URL"
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setShowConfigDrawer(false);
                    Alert.alert('URL Diterapkan', 'URL manifest pembaruan telah diperbarui untuk sesi ini.');
                  }}
                  style={{ alignSelf: 'flex-start', marginTop: theme.spacing.xs }}
                />
              </View>
            )}
          </Card>

          {/* 3. Available Update Detail Card */}
          {checkResult?.status === 'UPDATE_AVAILABLE' && checkResult.manifest && (
            <Card variant="standard" style={[styles.card, { borderColor: colors.primary }]}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.avatarCircle, { backgroundColor: colors.primarySoft }]}>
                  <Icon name="download" size={24} color={colors.primary} />
                </View>
                <View style={styles.cardHeaderMeta}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {checkResult.manifest.title || `Versi v${checkResult.manifest.version}`}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    Build {checkResult.manifest.versionCode} • Ukuran: {formatFileSize(checkResult.manifest.fileSize)}
                  </Text>
                </View>
                <Badge label="Siap Unduh" variant="info" />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Catatan Rilis (Changelog):</Text>
              <View style={[styles.changelogBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.changelogText, { color: colors.textPrimary }]}>
                  {checkResult.manifest.releaseNotes}
                </Text>
              </View>

              {/* Download Progress Bar */}
              {downloadState === 'DOWNLOADING' && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeaderRow}>
                    <Text style={[styles.progressText, { color: colors.textPrimary }]}>
                      Mengunduh berkas APK... ({Math.round(downloadProgress.progress * 100)}%)
                    </Text>
                    <Text style={[styles.progressBytes, { color: colors.textSecondary }]}>
                      {formatFileSize(downloadProgress.bytesWritten)} / {formatFileSize(downloadProgress.totalBytes)}
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: colors.primary,
                          width: `${Math.round(downloadProgress.progress * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <Button
                    title="Batalkan Pengunduhan"
                    variant="outline"
                    size="sm"
                    onPress={handleCancelDownload}
                    style={{ marginTop: theme.spacing.sm }}
                  />
                </View>
              )}

              {/* Verifying Spinner */}
              {downloadState === 'VERIFYING' && (
                <View style={styles.verifyingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.verifyingText, { color: colors.textPrimary }]}>
                    Memverifikasi integritas berkas (Checksum SHA-256)...
                  </Text>
                </View>
              )}

              {/* Ready to Install State */}
              {downloadState === 'READY_TO_INSTALL' && (
                <View style={[styles.readyInstallBox, { backgroundColor: colors.successLight || '#EBFBF2', borderColor: colors.success }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Icon name="check" size={20} color={colors.success} style={{ marginRight: 8 }} />
                    <Text style={[styles.readyInstallTitle, { color: colors.success }]}>
                      Berkas APK Terverifikasi Aman
                    </Text>
                  </View>
                  <Text style={[styles.readyInstallDesc, { color: colors.textPrimary }]}>
                    Checksum SHA-256 berkas cocok dengan metadata rilis. Tekan tombol di bawah untuk membuka penginstal Android.
                  </Text>
                </View>
              )}

              {/* Error Message */}
              {downloadError && (
                <View style={[styles.errorBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.error }]}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{downloadError}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={[styles.actionRow, { marginTop: theme.spacing.md }]}>
                {downloadState === 'READY_TO_INSTALL' ? (
                  <Button
                    title="Pasang Pembaruan Sekarang"
                    variant="primary"
                    onPress={handleInstall}
                    leftIcon={<Icon name="check" size={18} color="#fff" style={{ marginRight: 8 }} />}
                  />
                ) : (
                  downloadState !== 'DOWNLOADING' && (
                    <Button
                      title="Unduh Pembaruan"
                      variant="primary"
                      onPress={handleStartDownload}
                      leftIcon={<Icon name="download" size={18} color="#fff" style={{ marginRight: 8 }} />}
                    />
                  )
                )}
              </View>
            </Card>
          )}

          {/* 4. Android Permission & Guidance Card */}
          <Card variant="standard" style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: colors.primarySoft }]}>
                <Icon name="security" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderMeta}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Petunjuk Pemasangan Android</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  Keamanan & izin pembaruan mandiri
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.guidanceText, { color: colors.textPrimary }]}>
              1. **Izin Sumber Tidak Dikenal:** Pada Android 8.0 ke atas, sistem meminta konfirmasi "Izinkan dari sumber ini" satu kali sebelum memasang berkas APK.
            </Text>
            <Text style={[styles.guidanceText, { color: colors.textPrimary, marginTop: 6 }]}>
              2. **Jaminan Data Tetap Aman:** Pembaruan ini dipasang langsung di atas aplikasi yang ada (*in-place update*). Semua data transaksi, stok produk, pengguna, dan PIN tidak akan hilang.
            </Text>
            <Text style={[styles.guidanceText, { color: colors.textPrimary, marginTop: 6 }]}>
              3. **Verifikasi Kunci Rilis:** Sistem Android hanya menerima pembaruan yang ditandatangani dengan kunci rilis resmi Store POS Mobile yang sama.
            </Text>

            <Button
              title="Buka Pengaturan Izin Android"
              variant="outline"
              size="sm"
              onPress={() => updateService.openUnknownAppSourcesSettings()}
              style={{ marginTop: theme.spacing.md, alignSelf: 'flex-start' }}
              leftIcon={<Icon name="settings" size={16} color={colors.primary} style={{ marginRight: 6 }} />}
            />
          </Card>
        </ResponsiveContainer>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  cardHeaderMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    ...theme.typography.bodyLarge,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...theme.typography.caption,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: theme.spacing.md,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  specItem: {
    minWidth: '45%',
    flex: 1,
  },
  specLabel: {
    ...theme.typography.caption,
    marginBottom: 2,
  },
  specValue: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
  },
  specValueCode: {
    ...theme.typography.caption,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  messageBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginVertical: theme.spacing.md,
  },
  messageText: {
    ...theme.typography.bodySmall,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  configDrawer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  configDrawerTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    marginBottom: 4,
  },
  configDrawerDesc: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.sm,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 13,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  changelogBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.md,
  },
  changelogText: {
    ...theme.typography.bodySmall,
    lineHeight: 20,
  },
  progressContainer: {
    marginVertical: theme.spacing.sm,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  progressText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
  },
  progressBytes: {
    ...theme.typography.caption,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  verifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.sm,
  },
  verifyingText: {
    ...theme.typography.bodySmall,
    fontWeight: '500',
  },
  readyInstallBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginVertical: theme.spacing.sm,
  },
  readyInstallTitle: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
  },
  readyInstallDesc: {
    ...theme.typography.caption,
    lineHeight: 18,
  },
  errorBox: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    marginVertical: theme.spacing.sm,
  },
  errorText: {
    ...theme.typography.bodySmall,
  },
  guidanceText: {
    ...theme.typography.bodySmall,
    lineHeight: 20,
  },
});
