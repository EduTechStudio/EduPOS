const fs = require('fs');

// Patch AddUserModal
let addModal = fs.readFileSync('src/components/users/AddUserModal.tsx', 'utf-8');
addModal = addModal.replace(
  "import { UserRepository } from '@/database/repositories/UserRepository';",
  "import { UserRepository } from '@/database/repositories/UserRepository';\nimport { RoleRepository } from '@/database/repositories/RoleRepository';\nimport { PermissionEntity } from '@/database/types';"
);
addModal = addModal.replace(
  "const [roleId, setRoleId] = useState(roles.length > 0 ? roles[0].id : '');",
  "const [roleId, setRoleId] = useState(roles.length > 0 ? roles[0].id : '');\n  const [rolePermissions, setRolePermissions] = useState<PermissionEntity[]>([]);\n\n  React.useEffect(() => {\n    if (roleId) {\n      new RoleRepository().getPermissions(roleId).then(setRolePermissions).catch(console.error);\n    }\n  }, [roleId]);"
);
addModal = addModal.replace(
  "</View>\n          </View>",
  "</View>\n\n            <Text style={styles.label}>Akses Default Peran (Read-Only)</Text>\n            <View style={styles.permissionsBox}>\n              {rolePermissions.map(p => (\n                <Text key={p.id} style={styles.permText}>• {p.name} ({p.key})</Text>\n              ))}\n            </View>\n          </View>"
);
addModal = addModal.replace(
  "roleTextActive: {\n    color: theme.colors.primary,\n    fontWeight: 'bold',\n  },",
  "roleTextActive: {\n    color: theme.colors.primary,\n    fontWeight: 'bold',\n  },\n  permissionsBox: {\n    backgroundColor: theme.colors.surfaceSubtle,\n    padding: theme.spacing.md,\n    borderRadius: theme.radius.sm,\n    maxHeight: 150,\n  },\n  permText: {\n    ...theme.typography.caption,\n    color: theme.colors.textSecondary,\n  },"
);
fs.writeFileSync('src/components/users/AddUserModal.tsx', addModal);

// Patch EditUserModal
let editModal = fs.readFileSync('src/components/users/EditUserModal.tsx', 'utf-8');
editModal = editModal.replace(
  "import { UserRepository } from '@/database/repositories/UserRepository';",
  "import { UserRepository } from '@/database/repositories/UserRepository';\nimport { RoleRepository } from '@/database/repositories/RoleRepository';\nimport { PermissionEntity } from '@/database/types';"
);
editModal = editModal.replace(
  "const [roleId, setRoleId] = useState(user.role_id);",
  "const [roleId, setRoleId] = useState(user.role_id);\n  const [rolePermissions, setRolePermissions] = useState<PermissionEntity[]>([]);\n\n  useEffect(() => {\n    if (roleId && visible) {\n      new RoleRepository().getPermissions(roleId).then(setRolePermissions).catch(console.error);\n    }\n  }, [roleId, visible]);"
);
editModal = editModal.replace(
  "</View>\n          </View>",
  "</View>\n\n            <Text style={styles.label}>Akses Default Peran (Read-Only)</Text>\n            <View style={styles.permissionsBox}>\n              {rolePermissions.map(p => (\n                <Text key={p.id} style={styles.permText}>• {p.name} ({p.key})</Text>\n              ))}\n            </View>\n          </View>"
);
editModal = editModal.replace(
  "roleTextActive: {\n    color: theme.colors.primary,\n    fontWeight: 'bold',\n  },",
  "roleTextActive: {\n    color: theme.colors.primary,\n    fontWeight: 'bold',\n  },\n  permissionsBox: {\n    backgroundColor: theme.colors.surfaceSubtle,\n    padding: theme.spacing.md,\n    borderRadius: theme.radius.sm,\n    maxHeight: 150,\n  },\n  permText: {\n    ...theme.typography.caption,\n    color: theme.colors.textSecondary,\n  },"
);
fs.writeFileSync('src/components/users/EditUserModal.tsx', editModal);

