export interface ReleaseManifest {
  version: string;
  versionCode: number;
  downloadUrl: string;
  sha256: string;
  fileSize?: number;
  releaseNotes: string;
  title?: string;
  releasedAt?: string;
  minSupportedVersionCode?: number;
}

export type UpdateCheckStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'UPDATE_AVAILABLE'
  | 'UP_TO_DATE'
  | 'STALE_METADATA'
  | 'CONFIGURATION_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_METADATA';

export interface UpdateCheckResult {
  status: UpdateCheckStatus;
  currentVersion: string;
  currentVersionCode: number;
  manifest?: ReleaseManifest;
  message?: string;
  checkedAt: string;
}

export interface DownloadProgress {
  totalBytes: number;
  bytesWritten: number;
  progress: number;
}

export type DownloadState =
  | 'IDLE'
  | 'DOWNLOADING'
  | 'VERIFYING'
  | 'READY_TO_INSTALL'
  | 'ERROR'
  | 'CANCELLED';
