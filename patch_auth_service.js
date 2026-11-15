const fs = require('fs');
let code = fs.readFileSync('src/services/auth/AuthorizationService.ts', 'utf-8');

code = code.replace(
  "import { RoleRepository } from '../../database/repositories/RoleRepository';",
  "import { RoleRepository } from '../../database/repositories/RoleRepository';\nimport { UserPermissionRepository } from '../../database/repositories/UserPermissionRepository';\nimport { PermissionRepository } from '../../database/repositories/PermissionRepository';"
);

code = code.replace(
  "private roleRepo = new RoleRepository();",
  "private roleRepo = new RoleRepository();\n  private userPermRepo = new UserPermissionRepository();\n  private permRepo = new PermissionRepository();"
);

const newSetCurrentUser = `
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
`;

code = code.replace(/async setCurrentUser[\s\S]*?this\.currentPermissions = new Set\(permissions\.map\(p => p\.key\)\);\n  }/, newSetCurrentUser.trim());

fs.writeFileSync('src/services/auth/AuthorizationService.ts', code);
