const fs = require('fs');
let code = fs.readFileSync('src/app/settings/users-permissions.tsx', 'utf-8');

code = code.replace(
  "<Text style={styles.userUsername}>@{item.username}</Text>",
  "<Text style={styles.userUsername}>@{item.username}</Text>\n        <Text style={{...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 4}}>\n          Akses: {item.role_id === 'owner' ? 'Full Access' : item.roleName}\n        </Text>"
);

fs.writeFileSync('src/app/settings/users-permissions.tsx', code);
