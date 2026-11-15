/**
 * Update Configuration for Store POS Mobile.
 *
 * NOTE: Set `MANIFEST_URL` to a valid HTTPS endpoint hosting `version.json`
 * (e.g. GitHub raw URL or static cloud bucket) once the repository is published.
 * If empty or set to the placeholder, the update service will report a clean
 * configuration message instead of attempting network calls to an unverified domain.
 */
export const UPDATE_CONFIG = {
  // Placeholder URL. Replace with your verified HTTPS release manifest URL.
  // Example: 'https://raw.githubusercontent.com/edutechs-team/store-pos-mobile/main/version.json'
  MANIFEST_URL: '',

  // Network request timeout in milliseconds
  REQUEST_TIMEOUT_MS: 10000,

  // Cache folder name for temporary APK storage
  APK_CACHE_SUBDIR: 'updates',
};
