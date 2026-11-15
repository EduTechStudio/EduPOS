import { getDatabase } from '../database';
import { RoleEntity, PermissionEntity } from '../types';
import { PermissionRepository } from './PermissionRepository';

export class RoleRepository {
  private permissionRepo = new PermissionRepository();

  async getAll(): Promise<RoleEntity[]> {
    const db = await getDatabase();
    return db.getAllAsync<RoleEntity>(
      'SELECT * FROM roles ORDER BY name ASC;'
    );
  }

  async getById(id: string): Promise<RoleEntity | null> {
    const db = await getDatabase();
    return db.getFirstAsync<RoleEntity>(
      'SELECT * FROM roles WHERE id = ?;',
      [id]
    );
  }

  async getPermissions(roleId: string): Promise<PermissionEntity[]> {
    return this.permissionRepo.getForRole(roleId);
  }

  async createCustomRole(role: Omit<RoleEntity, 'is_system' | 'created_at' | 'updated_at'>): Promise<RoleEntity> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO roles (id, name, description, is_system, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?);`,
      [role.id, role.name, role.description, now, now]
    );
    return (await this.getById(role.id))!;
  }

  async updateRole(id: string, role: Partial<Omit<RoleEntity, 'id' | 'is_system' | 'created_at' | 'updated_at'>>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const sets = [];
    const values = [];
    if (role.name !== undefined) { sets.push('name = ?'); values.push(role.name); }
    if (role.description !== undefined) { sets.push('description = ?'); values.push(role.description); }
    if (sets.length === 0) return;
    
    sets.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    await db.runAsync(`UPDATE roles SET ${sets.join(', ')} WHERE id = ?;`, values);
  }

  async deleteCustomRole(id: string): Promise<void> {
    if (id === 'owner' || id === 'cashier') {
      throw new Error('Cannot delete system roles');
    }
    const db = await getDatabase();
    // Verify no users are assigned
    const count = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM users WHERE role_id = ?;', [id]);
    if (count && count.count > 0) {
      throw new Error('Cannot delete role that is assigned to users');
    }
    await db.runAsync('DELETE FROM role_permissions WHERE role_id = ?;', [id]);
    await db.runAsync('DELETE FROM roles WHERE id = ?;', [id]);
  }
}
