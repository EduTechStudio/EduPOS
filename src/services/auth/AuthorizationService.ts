import { UserRepository } from '../../database/repositories/UserRepository';
import { RoleRepository } from '../../database/repositories/RoleRepository';
import { UserPermissionRepository } from '../../database/repositories/UserPermissionRepository';
import { PermissionRepository } from '../../database/repositories/PermissionRepository';
import { PermissionKey } from '../../types/permissions';
import { UserEntity, RoleEntity, PermissionEntity } from '../../database/types';

export class PermissionDeniedError extends Error {
  constructor(permission: PermissionKey) {
    super(`Access Denied: Missing permission '${permission}'`);
    this.name = 'PermissionDeniedError';
  }
}

export class AuthorizationService {
  private userRepo = new UserRepository();
  private roleRepo = new RoleRepository();
  private userPermRepo = new UserPermissionRepository();
  private permRepo = new PermissionRepository();
  
  private currentUser: UserEntity | null = null;
  private currentRole: RoleEntity | null = null;
  private currentPermissions: Set<string> = new Set();

  async setCurrentUser(userId: string): Promise<void> {
    const user = await this.userRepo.getById(userId);
    if (!user || !user.is_active) {
      this.clearCurrentUser();
      throw new Error('User not found or inactive');
    }
    
    const role = await this.roleRepo.getById(user.role_id);
    if (!role) {
      this.clearCurrentUser();
      throw new Error('User role not found');
    }
    
    // 1. Get role permissions
    const rolePermissions = await this.roleRepo.getPermissions(role.id);
    const effectiveKeys = new Set(rolePermissions.map(p => p.key));
    
    // 2. Get user overrides
    const overrides = await this.userPermRepo.getOverridesForUser(user.id);
    
    // 3. Apply overrides
    if (overrides.length > 0) {
      // Fetch all permissions to map permission_id to key
      const allPerms = await this.permRepo.getAll();
      const permMap = new Map(allPerms.map(p => [p.id, p.key]));
      
      for (const override of overrides) {
        const key = permMap.get(override.permission_id);
        if (key) {
          if (override.effect === 'GRANT') {
            effectiveKeys.add(key);
          } else if (override.effect === 'DENY') {
            effectiveKeys.delete(key);
          }
        }
      }
    }
    
    this.currentUser = user;
    this.currentRole = role;
    this.currentPermissions = effectiveKeys;
  }

  clearCurrentUser(): void {
    this.currentUser = null;
    this.currentRole = null;
    this.currentPermissions.clear();
  }

  getCurrentUser(): UserEntity | null {
    return this.currentUser;
  }
  
  getCurrentRole(): RoleEntity | null {
    return this.currentRole;
  }
  
  getCurrentPermissions(): Set<string> {
    return this.currentPermissions;
  }

  hasPermission(permissionKey: PermissionKey): boolean {
    
    return this.currentPermissions.has(permissionKey);
  }

  hasAnyPermission(permissionKeys: PermissionKey[]): boolean {
    
    return permissionKeys.some(key => this.currentPermissions.has(key));
  }

  hasAllPermissions(permissionKeys: PermissionKey[]): boolean {
    
    return permissionKeys.every(key => this.currentPermissions.has(key));
  }

  requirePermission(permissionKey: PermissionKey): void {
    if (!this.hasPermission(permissionKey)) {
      throw new PermissionDeniedError(permissionKey);
    }
  }
}

export const authorizationService = new AuthorizationService();
