import { UserRepository } from '../../database/repositories/UserRepository';
import { UserEntity } from '../../database/types';
import { withTransaction } from '../../database';
import { authorizationService } from '../auth/AuthorizationService';
import { authService } from '../auth/AuthService';
import { verifyPin, isLegacyHash } from '../../utils/crypto';

export interface DeleteUserResult {
  success: boolean;
  mode: 'physical' | 'soft';
  message: string;
}

/**
 * Asynchronous FIFO queue / mutex to serialize user PIN mutations.
 * Guarantees that uniqueness checking, cryptographic hashing, and SQLite persistence
 * execute sequentially without concurrency interleaving.
 * Rejections or errors in one task do not break the queue for subsequent tasks.
 */
export class AsyncMutationQueue {
  private tail: Promise<any> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const runTask = () => task();
    const next = this.tail.then(runTask, runTask);
    this.tail = next.then(() => {}, () => {});
    return next;
  }
}

// Module-level shared singleton queue across all user mutation call paths
const sharedUserMutationQueue = new AsyncMutationQueue();

export class UserService {
  private userRepo = new UserRepository();
  private mutationQueue = sharedUserMutationQueue;

  /**
   * Returns the shared mutation queue for inspection and concurrency testing.
   */
  getMutationQueue(): AsyncMutationQueue {
    return this.mutationQueue;
  }

  /**
   * Asserts that a candidate PIN is unique among all active users.
   * Checks against both legacy `${pin}_hashed` and modern PBKDF2 hashes.
   * 
   * @param candidatePin Plaintext PIN to test
   * @param excludeUserId Optional user ID to exclude (e.g. current user when changing PIN)
   * @throws Error if the PIN is already in use by another active user
   */
  async assertPinUnique(candidatePin: string, excludeUserId?: string): Promise<void> {
    if (!candidatePin || typeof candidatePin !== 'string') {
      throw new Error('PIN tidak valid');
    }

    const activeUsers = await this.userRepo.getActiveUsers();
    
    // 1. Check legacy users first (~0ms string comparisons)
    const legacyUsers = activeUsers.filter(u => isLegacyHash(u.pin_hash));
    for (const u of legacyUsers) {
      if (excludeUserId && u.id === excludeUserId) continue;
      const isMatch = await verifyPin(candidatePin, u.pin_hash);
      if (isMatch) {
        throw new Error('PIN sudah digunakan oleh pengguna lain');
      }
    }

    // 2. Check modern PBKDF2 users
    const modernUsers = activeUsers.filter(u => !isLegacyHash(u.pin_hash));
    for (const u of modernUsers) {
      if (excludeUserId && u.id === excludeUserId) continue;
      const isMatch = await verifyPin(candidatePin, u.pin_hash);
      if (isMatch) {
        throw new Error('PIN sudah digunakan oleh pengguna lain');
      }
    }
  }

  /**
   * Creates a user with full service-layer serialization.
   * Authoritatively performs uniqueness check, hashing, and database write inside the mutation queue.
   */
  async createUser(input: {
    id?: string;
    name: string;
    username: string;
    pin: string;
    role_id: string;
    is_active?: number;
  }): Promise<UserEntity> {
    authorizationService.requirePermission('user.create');
    const username = input.username.trim().toLowerCase();
    const existing = await this.userRepo.getByUsername(username);
    if (existing) {
      throw new Error('Username sudah digunakan');
    }
    return this.mutationQueue.run(async () => {
      await this.assertPinUnique(input.pin);
      const pin_hash = await authService.hashPin(input.pin);
      const id = input.id || 'usr_' + Date.now();
      return this.userRepo.create({
        id,
        name: input.name.trim(),
        username,
        pin_hash,
        role_id: input.role_id,
        is_active: input.is_active !== undefined ? input.is_active : 1,
      });
    });
  }

  async create(user: Omit<UserEntity, 'created_at' | 'updated_at'>, candidatePin?: string): Promise<UserEntity> {
    authorizationService.requirePermission('user.create');
    const existing = await this.userRepo.getByUsername(user.username.trim().toLowerCase());
    if (existing) {
      throw new Error('Username sudah digunakan');
    }
    return this.mutationQueue.run(async () => {
      if (candidatePin) {
        await this.assertPinUnique(candidatePin);
      } else if (isLegacyHash(user.pin_hash)) {
        await this.assertPinUnique(user.pin_hash.replace(/_hashed$/, ''));
      }
      return this.userRepo.create(user);
    });
  }

  async update(
    id: string,
    user: Partial<Omit<UserEntity, 'id' | 'created_at' | 'updated_at'>>,
    candidatePin?: string
  ): Promise<void> {
    authorizationService.requirePermission('user.edit');
    if (candidatePin) {
      return this.mutationQueue.run(async () => {
        await this.assertPinUnique(candidatePin, id);
        return this.userRepo.update(id, user);
      });
    }
    return this.userRepo.update(id, user);
  }

  /**
   * Allows any authenticated user to edit their own profile (name, username).
   * Does not require 'user.edit' permission, but strictly verifies that the target
   * user ID matches the authenticated session user, and prevents altering role,
   * permissions, or active status.
   */
  async updateSelfProfile(
    userId: string,
    input: { name: string; username: string }
  ): Promise<UserEntity> {
    const currentAuthUser = authorizationService.getCurrentUser();
    if (!currentAuthUser || currentAuthUser.id !== userId) {
      throw new Error('Anda hanya dapat mengubah profil akun Anda sendiri.');
    }

    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error('Nama lengkap tidak boleh kosong.');
    }

    const trimmedUsername = input.username.trim().toLowerCase();
    if (!trimmedUsername) {
      throw new Error('Username tidak boleh kosong.');
    }

    if (trimmedUsername.length < 3) {
      throw new Error('Username minimal 3 karakter.');
    }

    if (!/^[a-z0-9_.-]+$/.test(trimmedUsername)) {
      throw new Error('Username hanya boleh berisi huruf, angka, titik, strip, dan garis bawah.');
    }

    return this.mutationQueue.run(async () => {
      // Check username uniqueness if changed
      if (trimmedUsername !== currentAuthUser.username.toLowerCase()) {
        const existing = await this.userRepo.getByUsername(trimmedUsername);
        if (existing && existing.id !== userId) {
          throw new Error(`Username '${trimmedUsername}' sudah digunakan oleh akun lain.`);
        }
      }

      // Update name and username only - role_id, pin_hash, is_active remain untouched
      await this.userRepo.update(userId, {
        name: trimmedName,
        username: trimmedUsername,
      });

      // Reload user and sync authorization service
      const updatedUser = (await this.userRepo.getById(userId))!;
      await authorizationService.setCurrentUser(userId);

      return updatedUser;
    });
  }

  /**
   * Dedicated service-layer method to update a user's PIN safely with uniqueness validation.
   * Serialized within the shared mutation queue.
   */
  async changePin(userId: string, newPin: string): Promise<void> {
    authorizationService.requirePermission('user.edit');
    return this.mutationQueue.run(async () => {
      await this.assertPinUnique(newPin, userId);
      const pin_hash = await authService.hashPin(newPin);
      return this.userRepo.update(userId, { pin_hash });
    });
  }

  async deactivate(id: string): Promise<void> {
    authorizationService.requirePermission('user.delete');
    return this.userRepo.deactivate(id);
  }

  /**
   * Inspects whether a user has historical business records (transactions, expenses, draft sales).
   */
  async checkHistoricalUsage(userId: string): Promise<{
    hasHistory: boolean;
    transactions: number;
    expenses: number;
    draftSales: number;
  }> {
    return this.userRepo.hasHistoricalReferences(userId);
  }

  /**
   * Safely deletes a user or soft-deletes (deactivates) them if historical records exist.
   * Enforces:
   * 1. 'user.delete' authorization
   * 2. Cannot delete the currently logged-in user
   * 3. Cannot delete the protected primary system owner ('user_owner' / 'owner')
   * 4. Cannot delete the last active owner account
   * 5. Preserves historical transaction & expense references without ON DELETE SET NULL corruption
   * 6. Serialized through sharedUserMutationQueue
   * 7. Atomic transaction with foreign_key_check
   */
  async deleteUser(targetUserId: string, requestingUserId?: string): Promise<DeleteUserResult> {
    authorizationService.requirePermission('user.delete');

    const currentAuthUser = authorizationService.getCurrentUser();
    const currentUserId = requestingUserId || currentAuthUser?.id;

    if (currentUserId && currentUserId === targetUserId) {
      throw new Error('Anda tidak dapat menghapus akun yang sedang Anda gunakan.');
    }

    return this.mutationQueue.run(async () => {
      // Revalidate target user immediately inside the serialized queue
      const targetUser = await this.userRepo.getById(targetUserId);
      if (!targetUser) {
        throw new Error('Pengguna tidak ditemukan.');
      }

      // Revalidate self-deletion check
      if (currentUserId && targetUser.id === currentUserId) {
        throw new Error('Anda tidak dapat menghapus akun yang sedang Anda gunakan.');
      }

      // Protect initial system owner
      if (targetUser.id === 'user_owner' || targetUser.username === 'owner') {
        throw new Error('Akun System Owner utama dilindungi dan tidak dapat dihapus.');
      }

      // Protect last active owner
      if (targetUser.role_id === 'owner') {
        const activeOwners = await this.userRepo.getActiveOwners();
        const otherActiveOwners = activeOwners.filter((u) => u.id !== targetUserId);
        if (otherActiveOwners.length === 0) {
          throw new Error(
            'Tidak dapat menghapus akun Owner terakhir. Sistem memerlukan minimal satu akun Owner aktif untuk administrasi.'
          );
        }
      }

      // Inspect historical references (transactions, expenses, draft_sales)
      console.log(`[UserService] Checking historical references for user ${targetUserId}...`);
      const history = await this.userRepo.hasHistoricalReferences(targetUserId);
      console.log(`[UserService] Historical usage for user ${targetUserId}:`, history);

      if (history.hasHistory) {
        // Soft deletion / deactivation to preserve financial & audit ledger integrity
        console.log(`[UserService] Executing soft delete (deactivation) for user ${targetUserId}...`);
        await withTransaction(async (dbClient) => {
          // 1. Remove user-specific custom permission overrides
          await dbClient.runAsync('DELETE FROM user_permissions WHERE user_id = ?;', [targetUserId]);

          // 2. Deactivate the user
          const now = new Date().toISOString();
          await dbClient.runAsync('UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?;', [now, targetUserId]);

          // 3. Verify user-related FK integrity
          try {
            const fkViolations = await dbClient.getAllAsync<{ table: string; rowid: number; parent: string; fkid: number }>(
              'PRAGMA foreign_key_check;'
            );
            const userFkViolations = (fkViolations || []).filter(
              (v) => v.parent === 'users' || v.table === 'users' || v.table === 'user_permissions'
            );
            if (userFkViolations.length > 0) {
              console.error('[UserService] Foreign key violations found during soft delete:', userFkViolations);
              throw new Error(`Integritas foreign key gagal saat menonaktifkan pengguna: ${userFkViolations.length} pelanggaran relasi.`);
            }
          } catch (fkErr: any) {
            if (fkErr.message && fkErr.message.includes('Integritas foreign key gagal')) {
              throw fkErr;
            }
            console.warn('[UserService] PRAGMA foreign_key_check check warning:', fkErr);
          }
        });

        const totalRecords = history.transactions + history.expenses + history.draftSales;
        console.log(`[UserService] Soft delete completed successfully for user ${targetUserId}`);
        return {
          success: true,
          mode: 'soft',
          message: `Pengguna ${targetUser.name} memiliki ${totalRecords} riwayat data transaksi/pengeluaran. Akun telah dinonaktifkan (soft delete) untuk menjaga integritas data pembukuan.`,
        };
      } else {
        // Physical deletion: safe because no historical business records reference this user
        console.log(`[UserService] Executing physical deletion for user ${targetUserId}...`);
        await withTransaction(async (dbClient) => {
          // 1. Remove user-specific custom permission overrides
          await dbClient.runAsync('DELETE FROM user_permissions WHERE user_id = ?;', [targetUserId]);

          // 2. Delete the user row
          await dbClient.runAsync('DELETE FROM users WHERE id = ?;', [targetUserId]);

          // 3. Verify user-related FK integrity
          try {
            const fkViolations = await dbClient.getAllAsync<{ table: string; rowid: number; parent: string; fkid: number }>(
              'PRAGMA foreign_key_check;'
            );
            const userFkViolations = (fkViolations || []).filter(
              (v) => v.parent === 'users' || v.table === 'users' || v.table === 'user_permissions'
            );
            if (userFkViolations.length > 0) {
              console.error('[UserService] Foreign key violations found during physical delete:', userFkViolations);
              throw new Error(`Integritas foreign key gagal saat menghapus pengguna: ${userFkViolations.length} pelanggaran relasi.`);
            }
          } catch (fkErr: any) {
            if (fkErr.message && fkErr.message.includes('Integritas foreign key gagal')) {
              throw fkErr;
            }
            console.warn('[UserService] PRAGMA foreign_key_check check warning:', fkErr);
          }
        });

        console.log(`[UserService] Physical deletion completed successfully for user ${targetUserId}`);
        return {
          success: true,
          mode: 'physical',
          message: `Pengguna ${targetUser.name} berhasil dihapus permanen dari sistem.`,
        };
      }
    });
  }

  async activate(id: string): Promise<void> {
    authorizationService.requirePermission('user.edit');
    return this.mutationQueue.run(async () => {
      const target = await this.userRepo.getById(id);
      if (target) {
        if (isLegacyHash(target.pin_hash)) {
          const legacyPin = target.pin_hash.replace(/_hashed$/, '');
          await this.assertPinUnique(legacyPin, id);
        } else {
          const activeUsers = await this.userRepo.getActiveUsers();
          for (const u of activeUsers) {
            if (u.id === id) continue;
            if (isLegacyHash(u.pin_hash)) {
              const activePin = u.pin_hash.replace(/_hashed$/, '');
              if (await verifyPin(activePin, target.pin_hash)) {
                throw new Error('PIN akun ini bertabrakan dengan akun aktif lain. Harap ubah PIN sebelum mengaktifkan.');
              }
            }
          }
        }
      }
      return this.userRepo.activate(id);
    });
  }

  /**
   * Safe audit utility to inspect active users for duplicate PINs.
   * Reports collision count and non-sensitive account identifiers (user IDs / usernames)
   * without logging or exposing plaintext PINs or stored hashes.
   */
  async auditDuplicatePins(): Promise<{
    totalActiveUsers: number;
    collisionCount: number;
    collidingUserPairs: { userA: string; userB: string }[];
  }> {
    const activeUsers = await this.userRepo.getActiveUsers();
    const collidingUserPairs: { userA: string; userB: string }[] = [];

    // Pairwise comparison
    for (let i = 0; i < activeUsers.length; i++) {
      for (let j = i + 1; j < activeUsers.length; j++) {
        const u1 = activeUsers[i];
        const u2 = activeUsers[j];

        let isDuplicate = false;
        if (isLegacyHash(u1.pin_hash) && isLegacyHash(u2.pin_hash)) {
          isDuplicate = u1.pin_hash === u2.pin_hash;
        } else if (isLegacyHash(u1.pin_hash)) {
          const pin1 = u1.pin_hash.replace(/_hashed$/, '');
          isDuplicate = await verifyPin(pin1, u2.pin_hash);
        } else if (isLegacyHash(u2.pin_hash)) {
          const pin2 = u2.pin_hash.replace(/_hashed$/, '');
          isDuplicate = await verifyPin(pin2, u1.pin_hash);
        }

        if (isDuplicate) {
          collidingUserPairs.push({
            userA: `${u1.username} (${u1.id})`,
            userB: `${u2.username} (${u2.id})`,
          });
        }
      }
    }

    return {
      totalActiveUsers: activeUsers.length,
      collisionCount: collidingUserPairs.length,
      collidingUserPairs,
    };
  }
}

export const userService = new UserService();
