import { getDatabase } from '../database';
import { PermissionEntity } from '../types';

export class PermissionRepository {
  async getAll(): Promise<PermissionEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<PermissionEntity>(
      'SELECT * FROM permissions ORDER BY key ASC;'
    );
  }

  async getByKey(key: string): Promise<PermissionEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<PermissionEntity>(
      'SELECT * FROM permissions WHERE key = ?;',
      [key]
    );
  }

  async getForRole(roleId: string): Promise<PermissionEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<PermissionEntity>(
      `SELECT p.* FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ? ORDER BY p.key ASC;`,
      [roleId]
    );
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM role_permissions WHERE role_id = ?;', [roleId]);
      for (const permId of permissionIds) {
        await db.runAsync(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?);',
          [roleId, permId]
        );
      }
    });
  }
}
