import { getDatabase } from '../database';

export interface UserPermissionEntity {
  id: string;
  user_id: string;
  permission_id: string;
  effect: 'GRANT' | 'DENY';
  created_at: string;
  updated_at: string;
}

export class UserPermissionRepository {
  async getOverridesForUser(userId: string): Promise<UserPermissionEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<UserPermissionEntity>(
      'SELECT * FROM user_permissions WHERE user_id = ?;',
      [userId]
    );
  }

  async getPermissionOverride(userId: string, permissionId: string): Promise<UserPermissionEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<UserPermissionEntity>(
      'SELECT * FROM user_permissions WHERE user_id = ? AND permission_id = ?;',
      [userId, permissionId]
    );
  }

  async setOverride(userId: string, permissionId: string, effect: 'GRANT' | 'DENY'): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const id = `up_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    await db.runAsync(
      `INSERT INTO user_permissions (id, user_id, permission_id, effect, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, permission_id) DO UPDATE SET effect = excluded.effect, updated_at = excluded.updated_at;`,
      [id, userId, permissionId, effect, now, now]
    );
  }

  async removeOverride(userId: string, permissionId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?;',
      [userId, permissionId]
    );
  }

  async clearOverrides(userId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM user_permissions WHERE user_id = ?;',
      [userId]
    );
  }
}
