let ExpoCrypto: typeof import('expo-crypto') | null = null;
try {
  // Native expo-crypto module when running in Expo Go / React Native
  ExpoCrypto = require('expo-crypto');
} catch {
  // Fallback to globalThis.crypto for test and non-native environments
  ExpoCrypto = null;
}

import { pbkdf2, pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/**
 * Calibrated PBKDF2-HMAC-SHA256 iteration count for mobile React Native (Hermes).
 * 
 * In Hermes on Android ARM processors without JIT, 5,000 iterations provides a solid
 * cryptographic barrier (~640,000 bitwise operations per attempt) while completing
 * in ~150-250 ms, avoiding JavaScript thread starvation and ANR timeouts.
 * 
 * Note: Stored hashes serialize the iteration count dynamically ($i=...),
 * so credentials previously created with higher iteration counts will continue
 * to verify correctly.
 */
export const DEFAULT_PBKDF2_ITERATIONS = 5_000;
export const MIN_PBKDF2_ITERATIONS = 1_000;
export const MAX_PBKDF2_ITERATIONS = 5_000_000;
export const SALT_LENGTH_BYTES = 16;
export const KEY_LENGTH_BYTES = 32;

const PBKDF2_REGEX = /^\$pbkdf2-sha256\$i=(\d+)\$s=([0-9a-fA-F]{32})\$h=([0-9a-fA-F]{64})$/;

/**
 * Compare two byte arrays using a non-short-circuiting bitwise XOR loop.
 * 
 * Security Limitation Note:
 * In higher-level JavaScript engines (like Hermes or V8), JIT optimizations,
 * memory caching, and garbage collection pauses may introduce subtle timing
 * variations. While bitwise XOR loops prevent standard early-exit timing leaks,
 * JavaScript cannot provide hardware cycle-accurate constant-time guarantees.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Constant-time string comparison for legacy hash verification.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;
  let diff = lenA ^ lenB;
  const maxLen = Math.max(lenA, lenB);
  for (let i = 0; i < maxLen; i++) {
    const codeA = i < lenA ? a.charCodeAt(i) : 0;
    const codeB = i < lenB ? b.charCodeAt(i) : 0;
    diff |= codeA ^ codeB;
  }
  return diff === 0;
}

function fillRandomBytes(target: Uint8Array): void {
  if (ExpoCrypto && typeof ExpoCrypto.getRandomValues === 'function') {
    ExpoCrypto.getRandomValues(target);
    return;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(target as any);
    return;
  }
  throw new Error('No cryptographically secure random number generator available in this environment');
}

/**
 * Derives a secure PBKDF2-HMAC-SHA256 hash formatted as a self-describing
 * Modular Crypt Format / PHC string:
 * $pbkdf2-sha256$i=<iterations>$s=<saltHex>$h=<hashHex>
 * 
 * Uses non-blocking pbkdf2Async to yield control back to the React Native event loop.
 */
export async function hashPin(pin: string, iterations = DEFAULT_PBKDF2_ITERATIONS): Promise<string> {
  if (typeof pin !== 'string' || pin.length === 0) {
    throw new Error('PIN must be a non-empty string');
  }

  // Generate cryptographically secure random 16-byte salt
  const salt = new Uint8Array(SALT_LENGTH_BYTES);
  fillRandomBytes(salt);

  const derivedKey = await pbkdf2Async(sha256, pin, salt, {
    c: iterations,
    dkLen: KEY_LENGTH_BYTES,
    asyncTick: 10,
  });

  const saltHex = bytesToHex(salt);
  const hashHex = bytesToHex(derivedKey);

  return `$pbkdf2-sha256$i=${iterations}$s=${saltHex}$h=${hashHex}`;
}

/**
 * Synchronous hashPin variant for backwards compatibility.
 */
export function hashPinSync(pin: string, iterations = DEFAULT_PBKDF2_ITERATIONS): string {
  if (typeof pin !== 'string' || pin.length === 0) {
    throw new Error('PIN must be a non-empty string');
  }

  const salt = new Uint8Array(SALT_LENGTH_BYTES);
  fillRandomBytes(salt);

  const derivedKey = pbkdf2(sha256, pin, salt, {
    c: iterations,
    dkLen: KEY_LENGTH_BYTES,
  });

  const saltHex = bytesToHex(salt);
  const hashHex = bytesToHex(derivedKey);

  return `$pbkdf2-sha256$i=${iterations}$s=${saltHex}$h=${hashHex}`;
}

/**
 * Checks if a stored credential string uses the legacy insecure `${pin}_hashed` format.
 */
export function isLegacyHash(storedHash: string | null | undefined): boolean {
  return typeof storedHash === 'string' && storedHash.endsWith('_hashed') && !storedHash.startsWith('$');
}

/**
 * Checks if a stored credential string strictly adheres to the modern `$pbkdf2-sha256$` format.
 * Validates:
 * 1. String type and PHC format matching $pbkdf2-sha256$i=<iter>$s=<salt>$h=<hash>
 * 2. Iteration count is within bounded safe range [1,000, 5,000,000] to prevent CPU starvation attacks
 * 3. Salt is exactly 16 bytes (32 hex characters)
 * 4. Derived key is exactly 32 bytes (64 hex characters)
 */
export function isModernHash(storedHash: string | null | undefined): boolean {
  if (typeof storedHash !== 'string' || !storedHash) {
    return false;
  }

  const match = storedHash.match(PBKDF2_REGEX);
  if (!match) {
    return false;
  }

  // Prevent leading zeros or negative values in iteration count representation
  if (match[1].length > 1 && match[1].startsWith('0')) {
    return false;
  }

  const iterations = parseInt(match[1], 10);
  if (isNaN(iterations) || iterations < MIN_PBKDF2_ITERATIONS || iterations > MAX_PBKDF2_ITERATIONS) {
    return false;
  }

  return true;
}

/**
 * Verifies a plaintext PIN against a stored credential string asynchronously.
 * Yields control to the React Native JS event loop during PBKDF2 execution.
 * Supports both modern PBKDF2 format and legacy format during the migration period.
 * Safely rejects malformed, null, or corrupted hash formats.
 */
export async function verifyPin(pin: string, storedHash: string | null | undefined): Promise<boolean> {
  if (typeof pin !== 'string' || typeof storedHash !== 'string' || !storedHash) {
    return false;
  }

  // 1. Legacy format verification: `${pin}_hashed` (0ms)
  if (isLegacyHash(storedHash)) {
    return timingSafeEqualString(storedHash, `${pin}_hashed`);
  }

  // 2. Modern PBKDF2 format verification: $pbkdf2-sha256$i=<iter>$s=<salt>$h=<hash>
  if (!isModernHash(storedHash)) {
    return false;
  }

  const match = storedHash.match(PBKDF2_REGEX)!;
  const iterations = parseInt(match[1], 10);

  try {
    const salt = hexToBytes(match[2]);
    const expectedKey = hexToBytes(match[3]);

    const computedKey = await pbkdf2Async(sha256, pin, salt, {
      c: iterations,
      dkLen: expectedKey.length,
      asyncTick: 10,
    });

    return timingSafeEqual(computedKey, expectedKey);
  } catch {
    return false;
  }
}

/**
 * Synchronous verifyPin variant.
 */
export function verifyPinSync(pin: string, storedHash: string | null | undefined): boolean {
  if (typeof pin !== 'string' || typeof storedHash !== 'string' || !storedHash) {
    return false;
  }

  if (isLegacyHash(storedHash)) {
    return timingSafeEqualString(storedHash, `${pin}_hashed`);
  }

  if (!isModernHash(storedHash)) {
    return false;
  }

  const match = storedHash.match(PBKDF2_REGEX)!;
  const iterations = parseInt(match[1], 10);

  try {
    const salt = hexToBytes(match[2]);
    const expectedKey = hexToBytes(match[3]);

    const computedKey = pbkdf2(sha256, pin, salt, {
      c: iterations,
      dkLen: expectedKey.length,
    });

    return timingSafeEqual(computedKey, expectedKey);
  } catch {
    return false;
  }
}
