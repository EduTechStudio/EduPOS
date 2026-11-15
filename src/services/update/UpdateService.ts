import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { UPDATE_CONFIG } from '@/config/updateConfig';
import {
  ReleaseManifest,
  UpdateCheckResult,
  UpdateCheckStatus,
  DownloadProgress,
} from '@/types/update';

export class UpdateService {
  private activeDownloadResumable: FileSystem.DownloadResumable | null = null;
  private isCancelled = false;

  /**
   * Returns current application version name and version code from Expo constants.
   */
  getCurrentVersion(): { version: string; versionCode: number; packageId: string } {
    const version = Constants.expoConfig?.version || '1.0.0';
    const versionCode = Constants.expoConfig?.android?.versionCode || 1;
    const packageId = Constants.expoConfig?.android?.package || 'com.storepos.mobile';

    return { version, versionCode, packageId };
  }

  /**
   * Validates whether an incoming object adheres to the ReleaseManifest specification.
   */
  validateManifest(data: any): { valid: boolean; manifest?: ReleaseManifest; error?: string } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Format metadata rilis bukan objek JSON yang valid.' };
    }

    const { version, versionCode, downloadUrl, sha256: hash, fileSize, releaseNotes } = data;

    if (!version || typeof version !== 'string' || version.trim().length === 0) {
      return { valid: false, error: 'Metadata tidak memiliki nilai version yang valid.' };
    }

    if (typeof versionCode !== 'number' || !Number.isInteger(versionCode) || versionCode <= 0) {
      return { valid: false, error: 'Nilai versionCode harus berupa bilangan bulat positif.' };
    }

    if (!downloadUrl || typeof downloadUrl !== 'string' || !downloadUrl.startsWith('https://')) {
      return { valid: false, error: 'URL unduhan APK harus berupa URL HTTPS yang valid.' };
    }

    if (!hash || typeof hash !== 'string' || !/^[a-fA-F0-9]{64}$/.test(hash.trim())) {
      return { valid: false, error: 'Nilai checksum sha256 harus berupa 64 karakter heksadesimal.' };
    }

    if (!releaseNotes || typeof releaseNotes !== 'string') {
      return { valid: false, error: 'Catatan rilis (releaseNotes) tidak ditemukan atau tidak valid.' };
    }

    if (fileSize !== undefined && (typeof fileSize !== 'number' || fileSize <= 0)) {
      return { valid: false, error: 'Nilai fileSize harus berupa angka positif jika disertakan.' };
    }

    const manifest: ReleaseManifest = {
      version: version.trim(),
      versionCode,
      downloadUrl: downloadUrl.trim(),
      sha256: hash.trim().toLowerCase(),
      fileSize,
      releaseNotes: releaseNotes.trim(),
      title: typeof data.title === 'string' ? data.title.trim() : undefined,
      releasedAt: typeof data.releasedAt === 'string' ? data.releasedAt.trim() : undefined,
      minSupportedVersionCode:
        typeof data.minSupportedVersionCode === 'number' && Number.isInteger(data.minSupportedVersionCode)
          ? data.minSupportedVersionCode
          : undefined,
    };

    return { valid: true, manifest };
  }

  /**
   * Fetches and checks the remote release manifest against the installed app version.
   */
  async checkUpdate(manifestUrl?: string): Promise<UpdateCheckResult> {
    const url = (manifestUrl || UPDATE_CONFIG.MANIFEST_URL).trim();
    const current = this.getCurrentVersion();
    const now = new Date().toISOString();

    if (!url || !url.startsWith('https://')) {
      return {
        status: 'CONFIGURATION_ERROR',
        currentVersion: current.version,
        currentVersionCode: current.versionCode,
        message: 'URL manifest pembaruan belum dikonfigurasi dengan URL HTTPS yang valid.',
        checkedAt: now,
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPDATE_CONFIG.REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          status: 'NETWORK_ERROR',
          currentVersion: current.version,
          currentVersionCode: current.versionCode,
          message: `Server mengembalikan status HTTP ${response.status} saat memeriksa pembaruan.`,
          checkedAt: now,
        };
      }

      const json = await response.json();
      const validation = this.validateManifest(json);

      if (!validation.valid || !validation.manifest) {
        return {
          status: 'INVALID_METADATA',
          currentVersion: current.version,
          currentVersionCode: current.versionCode,
          message: validation.error || 'Metadata pembaruan tidak memenuhi spesifikasi.',
          checkedAt: now,
        };
      }

      const remoteManifest = validation.manifest;

      // Authoritative comparison using Android versionCode (integer ordering)
      if (remoteManifest.versionCode > current.versionCode) {
        return {
          status: 'UPDATE_AVAILABLE',
          currentVersion: current.version,
          currentVersionCode: current.versionCode,
          manifest: remoteManifest,
          message: `Versi baru v${remoteManifest.version} (Build ${remoteManifest.versionCode}) tersedia.`,
          checkedAt: now,
        };
      } else if (remoteManifest.versionCode === current.versionCode) {
        return {
          status: 'UP_TO_DATE',
          currentVersion: current.version,
          currentVersionCode: current.versionCode,
          manifest: remoteManifest,
          message: 'Aplikasi Store POS Anda sudah menggunakan versi terbaru.',
          checkedAt: now,
        };
      } else {
        return {
          status: 'STALE_METADATA',
          currentVersion: current.version,
          currentVersionCode: current.versionCode,
          manifest: remoteManifest,
          message: `Metadata rilis remote (Build ${remoteManifest.versionCode}) lebih lama daripada versi terpasang (Build ${current.versionCode}).`,
          checkedAt: now,
        };
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return {
          status: 'NETWORK_ERROR',
          currentVersion: current.version,
          currentVersionCode: current.versionCode,
          message: 'Waktu koneksi habis (timeout) saat memeriksa pembaruan.',
          checkedAt: now,
        };
      }

      return {
        status: 'NETWORK_ERROR',
        currentVersion: current.version,
        currentVersionCode: current.versionCode,
        message: error?.message || 'Gagal terhubung ke server pembaruan. Periksa koneksi internet Anda.',
        checkedAt: now,
      };
    }
  }

  /**
   * Downloads the APK file to application cache with progress reporting.
   */
  async downloadUpdate(
    manifest: ReleaseManifest,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<{ fileUri: string }> {
    if (!manifest.downloadUrl.startsWith('https://')) {
      throw new Error('Hanya tautan HTTPS yang diizinkan untuk mengunduh pembaruan APK.');
    }

    this.isCancelled = false;

    // Prepare destination in cache directory
    const cacheDir = `${FileSystem.cacheDirectory}${UPDATE_CONFIG.APK_CACHE_SUBDIR}/`;
    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

    const fileName = `store-pos-v${manifest.versionCode}.apk`;
    const destinationUri = `${cacheDir}${fileName}`;

    // Clean up any preexisting incomplete file at destination
    const existing = await FileSystem.getInfoAsync(destinationUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(destinationUri, { idempotent: true });
    }

    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      if (this.isCancelled) return;
      const total = downloadProgress.totalBytesExpectedToWrite;
      const written = downloadProgress.totalBytesWritten;
      const progress = total > 0 ? written / total : 0;

      onProgress?.({
        totalBytes: total,
        bytesWritten: written,
        progress: Math.min(1, Math.max(0, progress)),
      });
    };

    this.activeDownloadResumable = FileSystem.createDownloadResumable(
      manifest.downloadUrl,
      destinationUri,
      {},
      callback
    );

    try {
      const result = await this.activeDownloadResumable.downloadAsync();
      this.activeDownloadResumable = null;

      if (this.isCancelled || !result || !result.uri) {
        await FileSystem.deleteAsync(destinationUri, { idempotent: true });
        throw new Error('Pengunduhan pembaruan dibatalkan oleh pengguna.');
      }

      // Check file size if manifest provided expected size
      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || info.size === 0) {
        await FileSystem.deleteAsync(destinationUri, { idempotent: true });
        throw new Error('Berkas APK hasil unduhan kosong atau tidak ditemukan.');
      }

      if (manifest.fileSize && Math.abs(info.size - manifest.fileSize) > 2048) {
        console.warn(`[UpdateService] Ukuran berkas (${info.size}) berbeda dari manifest (${manifest.fileSize}).`);
      }

      // Verify SHA-256 integrity
      const verified = await this.verifyFileSha256(result.uri, manifest.sha256);
      if (!verified) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        throw new Error('Verifikasi integritas berkas gagal. Checksum SHA-256 tidak cocok.');
      }

      return { fileUri: result.uri };
    } catch (error: any) {
      this.activeDownloadResumable = null;
      try {
        await FileSystem.deleteAsync(destinationUri, { idempotent: true });
      } catch {
        // ignore delete failure
      }
      throw error;
    }
  }

  /**
   * Cancels any active download operation.
   */
  async cancelDownload(): Promise<void> {
    this.isCancelled = true;
    if (this.activeDownloadResumable) {
      try {
        await this.activeDownloadResumable.cancelAsync();
      } catch (e) {
        console.warn('[UpdateService] Error cancelling download:', e);
      } finally {
        this.activeDownloadResumable = null;
      }
    }
  }

  /**
   * Computes the SHA-256 checksum of a local file and compares it against expected hex hash.
   */
  async verifyFileSha256(fileUri: string, expectedHash: string): Promise<boolean> {
    try {
      let calculatedHash = '';

      try {
        // Attempt streaming via modern File API in SDK 57 (memory-efficient)
        const file = new File(fileUri);
        const stream = file.readableStream();
        const reader = stream.getReader();
        const hasher = sha256.create();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) hasher.update(value);
        }

        calculatedHash = bytesToHex(hasher.digest());
      } catch (streamError) {
        console.warn('[UpdateService] Stream hashing unavailable, falling back to base64 chunk:', streamError);
        // Fallback: Read as base64 string
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        calculatedHash = bytesToHex(sha256(bytes));
      }

      const normalizedExpected = expectedHash.trim().toLowerCase();
      const normalizedCalculated = calculatedHash.trim().toLowerCase();

      return normalizedCalculated === normalizedExpected;
    } catch (error) {
      console.error('[UpdateService] Gagal menghitung hash berkas:', error);
      return false;
    }
  }

  /**
   * Triggers the native Android Package Installer for a verified APK file.
   */
  async installUpdate(fileUri: string): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('Pemasangan APK mandiri hanya didukung pada perangkat Android.');
    }

    try {
      // Convert internal cache file:// to secure content:// URI via Expo FileProvider
      const contentUri = await FileSystem.getContentUriAsync(fileUri);

      if (!contentUri) {
        throw new Error('Gagal membuat Content URI untuk berkas APK.');
      }

      // Launch Android package installer intent
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
      });
    } catch (error: any) {
      console.error('[UpdateService] Gagal meluncurkan intent pemasangan:', error);
      throw new Error(
        error?.message || 'Gagal membuka penginstal paket Android. Pastikan izin pemasangan telah diberikan.'
      );
    }
  }

  /**
   * Opens the system settings screen to allow installing unknown apps.
   */
  async openUnknownAppSourcesSettings(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const packageId = this.getCurrentVersion().packageId;
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.MANAGE_UNKNOWN_APP_SOURCES, {
        data: `package:${packageId}`,
      });
    } catch (error) {
      console.warn('[UpdateService] Gagal membuka pengaturan unknown apps:', error);
      // Fallback to general application details settings
      try {
        const packageId = this.getCurrentVersion().packageId;
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
          data: `package:${packageId}`,
        });
      } catch {
        // ignore fallback error
      }
    }
  }
}

export const updateService = new UpdateService();
