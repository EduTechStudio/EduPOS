import { getDatabase } from '../database';
import { AuthLockoutEntity } from '../types';

export const GLOBAL_LOCKOUT_ID = 'global_pos_lockout';

/**
 * Asynchronous FIFO queue to serialize database writes for authentication security.
 * Prevents concurrent failed attempts from racing or overwriting failure counters.
 */
export class AsyncAuthQueue {
  private tail: Promise<any> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const runTask = () => task();
    const next = this.tail.then(runTask, runTask);
    this.tail = next.then(() => {}, () => {});
    return next;
  }
}

const sharedAuthSecurityQueue = new AsyncAuthQueue();

export class AuthSecurityRepository {
  private queue = sharedAuthSecurityQueue;

  /**
   * Retrieves the current device-wide authentication lockout state.
   * If the singleton record does not yet exist, creates it with default 0 attempts.
   */
  async getLockout(): Promise<AuthLockoutEntity> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<AuthLockoutEntity>(
      'SELECT * FROM auth_lockout WHERE id = ?;',
      [GLOBAL_LOCKOUT_ID]
    );

    if (row) {
      return row;
    }

    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT OR IGNORE INTO auth_lockout (id, failed_attempts, locked_until, updated_at) VALUES (?, 0, NULL, ?);',
      [GLOBAL_LOCKOUT_ID, now]
    );

    const created = await db.getFirstAsync<AuthLockoutEntity>(
      'SELECT * FROM auth_lockout WHERE id = ?;',
      [GLOBAL_LOCKOUT_ID]
    );

    return created || {
      id: GLOBAL_LOCKOUT_ID,
      failed_attempts: 0,
      locked_until: null,
      updated_at: now,
    };
  }

  /**
   * Records a failed authentication attempt atomically.
   * Serializes execution via sharedAuthSecurityQueue and db.withTransactionAsync.
   * Computes the new failure count and lockout duration via the provided policy function.
   */
  async recordFailedAttempt(
    calculateDuration: (attempts: number) => number
  ): Promise<AuthLockoutEntity> {
    return this.queue.run(async () => {
      const db = await getDatabase();
      let result: AuthLockoutEntity | null = null;

      await db.withTransactionAsync(async () => {
        let row = await db.getFirstAsync<AuthLockoutEntity>(
          'SELECT * FROM auth_lockout WHERE id = ?;',
          [GLOBAL_LOCKOUT_ID]
        );

        if (!row) {
          const now = new Date().toISOString();
          await db.runAsync(
            'INSERT OR IGNORE INTO auth_lockout (id, failed_attempts, locked_until, updated_at) VALUES (?, 0, NULL, ?);',
            [GLOBAL_LOCKOUT_ID, now]
          );
          row = await db.getFirstAsync<AuthLockoutEntity>(
            'SELECT * FROM auth_lockout WHERE id = ?;',
            [GLOBAL_LOCKOUT_ID]
          );
        }

        const currentAttempts = row ? row.failed_attempts : 0;
        const newAttempts = currentAttempts + 1;
        const durationSeconds = calculateDuration(newAttempts);
        const now = new Date();
        const lockedUntil =
          durationSeconds > 0
            ? new Date(now.getTime() + durationSeconds * 1000).toISOString()
            : null;
        const nowIso = now.toISOString();

        await db.runAsync(
          'UPDATE auth_lockout SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?;',
          [newAttempts, lockedUntil, nowIso, GLOBAL_LOCKOUT_ID]
        );

        result = {
          id: GLOBAL_LOCKOUT_ID,
          failed_attempts: newAttempts,
          locked_until: lockedUntil,
          updated_at: nowIso,
        };
      });

      return result!;
    });
  }

  /**
   * Resets the failed-attempt counter and clears any lockout.
   * Executed only upon verified single-user authentication.
   */
  async resetLockout(): Promise<void> {
    return this.queue.run(async () => {
      const db = await getDatabase();
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT INTO auth_lockout (id, failed_attempts, locked_until, updated_at)
         VALUES (?, 0, NULL, ?)
         ON CONFLICT(id) DO UPDATE SET failed_attempts = 0, locked_until = NULL, updated_at = ?;`,
        [GLOBAL_LOCKOUT_ID, now, now]
      );
    });
  }
}
