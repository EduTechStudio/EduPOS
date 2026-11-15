import { UserRepository } from '../../database/repositories/UserRepository';
import { AuthSecurityRepository } from '../../database/repositories/AuthSecurityRepository';
import { UserEntity } from '../../database/types';
import { authorizationService } from './AuthorizationService';
import { getDatabase } from '../../database';
import { hashPin, hashPinSync, verifyPin, isLegacyHash } from '../../utils/crypto';

export class AmbiguousPinError extends Error {
  code = 'AMBIGUOUS_PIN';
  constructor(message = 'PIN terdaftar pada lebih dari satu akun aktif. Silakan hubungi Administrator.') {
    super(message);
    this.name = 'AmbiguousPinError';
  }
}

export class AuthLockoutError extends Error {
  code = 'AUTH_LOCKOUT';
  remainingSeconds: number;

  constructor(remainingSeconds: number, message?: string) {
    super(
      message ||
        `Terlalu banyak percobaan PIN salah. Silakan coba lagi dalam ${remainingSeconds} detik.`
    );
    this.name = 'AuthLockoutError';
    this.remainingSeconds = remainingSeconds;
  }
}

export function calculateLockoutDurationSeconds(attempts: number): number {
  if (attempts < 5) return 0;
  if (attempts === 5) return 30;
  if (attempts === 6) return 60;
  if (attempts === 7) return 120;
  if (attempts === 8) return 300;
  return 900; // 15 minutes max
}

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  isWarning: boolean;
}

export class AuthService {
  private userRepo = new UserRepository();
  private authSecurityRepo = new AuthSecurityRepository();

  /**
   * Retrieves the current device-wide authentication lockout status.
   */
  async getLockoutStatus(): Promise<LockoutStatus> {
    const lockout = await this.authSecurityRepo.getLockout();
    if (!lockout.locked_until) {
      return {
        isLocked: false,
        remainingSeconds: 0,
        failedAttempts: lockout.failed_attempts,
        isWarning: lockout.failed_attempts === 4,
      };
    }

    const now = Date.now();
    const lockedUntilMs = new Date(lockout.locked_until).getTime();

    if (now < lockedUntilMs) {
      const remainingSeconds = Math.max(1, Math.ceil((lockedUntilMs - now) / 1000));
      return {
        isLocked: true,
        remainingSeconds,
        failedAttempts: lockout.failed_attempts,
        isWarning: false,
      };
    }

    // Cooldown expired: user is allowed to retry, failed_attempts is retained
    return {
      isLocked: false,
      remainingSeconds: 0,
      failedAttempts: lockout.failed_attempts,
      isWarning: lockout.failed_attempts === 4,
    };
  }

  /**
   * Authenticates a user by PIN.
   * 
   * Supports both modern PBKDF2-HMAC-SHA256 and legacy `${pin}_hashed` credentials.
   * Checks legacy users first (instant ~0ms string check) to ensure zero PBKDF2
   * overhead for unmigrated accounts.
   * 
   * AUTH-02 Brute-Force Protection:
   * Rejects immediately if device is in active cooldown BEFORE running PBKDF2.
   * Tracks consecutive failed attempts and applies escalating cooldowns.
   * Resets counter only after complete verified authentication.
   * 
   * Critical PIN Uniqueness Protection:
   * Collects all active matching users across legacy and modern accounts.
   * If more than one active user matches the entered PIN, authentication is immediately
   * rejected by throwing AmbiguousPinError, preventing silent arbitrary account selection.
   * Lazy migration is only executed when exactly one user matches.
   */
  async authenticateWithPin(pin: string): Promise<UserEntity | null> {
    // 1. Enforce active lockout BEFORE any crypto or user lookup
    const status = await this.getLockoutStatus();
    if (status.isLocked) {
      throw new AuthLockoutError(status.remainingSeconds);
    }

    const users = await this.userRepo.getActiveUsers();
    const matchingUsers: UserEntity[] = [];

    // 2. Check legacy users first (instant ~0ms string check)
    const legacyUsers = users.filter(u => isLegacyHash(u.pin_hash));
    for (const user of legacyUsers) {
      const isMatch = await verifyPin(pin, user.pin_hash);
      if (isMatch) {
        matchingUsers.push(user);
        if (matchingUsers.length >= 2) {
          console.warn('[AuthService] Multiple active accounts match the entered PIN. Rejecting ambiguous authentication.');
          const lockout = await this.authSecurityRepo.recordFailedAttempt(calculateLockoutDurationSeconds);
          if (lockout.locked_until) {
            const remainingSeconds = Math.max(1, Math.ceil((new Date(lockout.locked_until).getTime() - Date.now()) / 1000));
            throw new AuthLockoutError(remainingSeconds);
          }
          throw new AmbiguousPinError();
        }
      }
    }

    // 3. Check modern PBKDF2 users (non-blocking async iterations)
    const modernUsers = users.filter(u => !isLegacyHash(u.pin_hash));
    for (const user of modernUsers) {
      const isMatch = await verifyPin(pin, user.pin_hash);
      if (isMatch) {
        matchingUsers.push(user);
        if (matchingUsers.length >= 2) {
          console.warn('[AuthService] Multiple active accounts match the entered PIN. Rejecting ambiguous authentication.');
          const lockout = await this.authSecurityRepo.recordFailedAttempt(calculateLockoutDurationSeconds);
          if (lockout.locked_until) {
            const remainingSeconds = Math.max(1, Math.ceil((new Date(lockout.locked_until).getTime() - Date.now()) / 1000));
            throw new AuthLockoutError(remainingSeconds);
          }
          throw new AmbiguousPinError();
        }
      }
    }
    
    if (matchingUsers.length === 0) {
      const lockout = await this.authSecurityRepo.recordFailedAttempt(calculateLockoutDurationSeconds);
      if (lockout.locked_until) {
        const remainingSeconds = Math.max(1, Math.ceil((new Date(lockout.locked_until).getTime() - Date.now()) / 1000));
        throw new AuthLockoutError(remainingSeconds);
      }
      return null;
    }

    const matchedUser = matchingUsers[0];

    // Transparent lazy migration for legacy credentials upon verified single-user login
    if (isLegacyHash(matchedUser.pin_hash)) {
      await this.migrateLegacyCredential(matchedUser, pin);
    }
    await authorizationService.setCurrentUser(matchedUser.id);

    // Reset lockout only after complete verified authentication
    await this.authSecurityRepo.resetLockout();

    return matchedUser;
  }

  /**
   * Generates a modern cryptographically secure PBKDF2-HMAC-SHA256 hash.
   * Never generates legacy `${pin}_hashed` strings.
   */
  async hashPin(pin: string): Promise<string> {
    return hashPin(pin);
  }

  /**
   * Synchronous variant of hashPin.
   */
  hashPinSync(pin: string): string {
    return hashPinSync(pin);
  }

  /**
   * Lazily migrates a verified legacy credential to modern PBKDF2-HMAC-SHA256.
   * Uses compare-and-swap (optimistic concurrency) to guarantee that credentials
   * modified concurrently are never overwritten.
   */
  private async migrateLegacyCredential(user: UserEntity, pin: string): Promise<void> {
    try {
      const modernHash = await hashPin(pin);
      const db = await getDatabase();
      const now = new Date().toISOString();

      const result = await db.runAsync(
        'UPDATE users SET pin_hash = ?, updated_at = ? WHERE id = ? AND pin_hash = ?;',
        [modernHash, now, user.id, user.pin_hash]
      );

      if (result.changes > 0) {
        user.pin_hash = modernHash;
        user.updated_at = now;
      } else {
        console.warn(`[AuthService] Lazy migration skipped for user ${user.id}: credential modified concurrently.`);
      }
    } catch (err: any) {
      // Non-fatal policy: Allow current login session to proceed since PIN was verified,
      // but leave DB and in-memory representation untouched so migration re-attempts later.
      console.error(`[AuthService] Lazy migration persistence failed for user ${user.id}: ${err.message || 'database error'}`);
    }
  }

  logout(): void {
    authorizationService.clearCurrentUser();
  }
}

export const authService = new AuthService();
