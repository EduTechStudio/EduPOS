const fs = require('fs');
let code = fs.readFileSync('src/app/settings/users-permissions.tsx', 'utf-8');

if (!code.includes("UserPermissionRepository")) {
  code = code.replace(
    "import { RoleRepository } from '@/database/repositories/RoleRepository';",
    "import { RoleRepository } from '@/database/repositories/RoleRepository';\nimport { UserPermissionRepository } from '@/database/repositories/UserPermissionRepository';"
  );
}

// Replace the loadData mapping
const originalMapping = `      const mapped = allUsers.map(u => ({
        ...u,
        roleName: allRoles.find(r => r.id === u.role_id)?.name || 'Unknown Role'
      }));
      setUsers(mapped);`;

const newMapping = `      const userPermRepo = new UserPermissionRepository();
      const mapped = await Promise.all(allUsers.map(async u => {
        const overrides = await userPermRepo.getOverridesForUser(u.id);
        return {
          ...u,
          hasCustom: overrides.length > 0,
          roleName: allRoles.find(r => r.id === u.role_id)?.name || 'Unknown Role'
        };
      }));
      setUsers(mapped);`;

code = code.replace(originalMapping, newMapping);

code = code.replace(
  "Akses: {item.role_id === 'owner' ? 'Full Access' : item.roleName}",
  "Akses: {item.role_id === 'owner' ? 'Full Access' : (item.hasCustom ? 'Custom' : 'Default')}"
);

// Fix FlatList / ScrollView regression
// The user says "Remove any unnecessary parent ScrollView around the FlatList."
// Let's check the render function.

fs.writeFileSync('src/app/settings/users-permissions.tsx', code);
