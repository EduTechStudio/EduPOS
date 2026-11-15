import { Migration } from './001_initial_schema';
import { allPermissions, initialRoles, defaultRolePermissions } from '../../config/defaultRolesAndPermissions';

export const migration005: Migration = {
  id: 5,
  name: '005_rbac_seed',
  up: [
    ...initialRoles.map(role => `
      INSERT OR IGNORE INTO roles (id, name, description, is_system, created_at, updated_at)
      VALUES ('${role.id}', '${role.name}', '${role.description}', ${role.isSystem ? 1 : 0}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    `),
    ...allPermissions.map(perm => {
      // Use the robust replace to generate an ID if it's a new row.
      const id = 'perm_' + perm.key.replace(/\./g, '_');
      return `
        INSERT INTO permissions (id, key, name, description, created_at)
        VALUES ('${id}', '${perm.key}', '${perm.label}', '${perm.category}', CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
          name = '${perm.label}', 
          description = '${perm.category}';
      `;
    }),
    ...defaultRolePermissions.flatMap(rp => 
      rp.permissions.map(permKey => {
        return `
          INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
          SELECT '${rp.roleId}', id FROM permissions WHERE key = '${permKey}';
        `;
      })
    ),
    // Ensure default users exist. If they exist but with different roles, we don't overwrite them.
    `INSERT OR IGNORE INTO users (id, name, username, pin_hash, role_id, is_active, created_at, updated_at)
     VALUES ('user_owner', 'Store Owner', 'owner', '1234_hashed', 'owner', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
    `INSERT OR IGNORE INTO users (id, name, username, pin_hash, role_id, is_active, created_at, updated_at)
     VALUES ('user_cashier', 'Primary Cashier', 'cashier', '0000_hashed', 'cashier', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`
  ]
};
