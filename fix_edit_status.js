const fs = require('fs');
let code = fs.readFileSync('src/components/users/EditUserModal.tsx', 'utf-8');

// Add status state
code = code.replace(
  "  const [roleId, setRoleId] = useState(user.role_id);",
  "  const [roleId, setRoleId] = useState(user.role_id);\n  const [isActive, setIsActive] = useState(user.is_active === 1);"
);

// Add to useEffect
code = code.replace(
  "      setRoleId(user.role_id);",
  "      setRoleId(user.role_id);\n      setIsActive(user.is_active === 1);"
);

// Add to update payload
code = code.replace(
  "        role_id: roleId,",
  "        role_id: roleId,\n        is_active: isActive ? 1 : 0,"
);

// Add to form UI
code = code.replace(
  "            <Text style={styles.label}>Peran (Role)</Text>",
  `            <Text style={styles.label}>Status Akun</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity 
                style={[styles.roleBtn, isActive && styles.roleBtnActive, user.role_id === 'owner' && { opacity: 0.5 }]}
                onPress={() => user.role_id !== 'owner' && setIsActive(true)}
              >
                <Text style={[styles.roleText, isActive && styles.roleTextActive]}>Aktif</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.roleBtn, !isActive && { borderColor: theme.colors.error, backgroundColor: theme.colors.errorLight }, user.role_id === 'owner' && { opacity: 0.5 }]}
                onPress={() => user.role_id !== 'owner' && setIsActive(false)}
              >
                <Text style={[styles.roleText, !isActive && { color: theme.colors.error, fontWeight: 'bold' }]}>Nonaktif</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Peran (Role)</Text>`
);

fs.writeFileSync('src/components/users/EditUserModal.tsx', code);
