const fs = require('fs');
let code = fs.readFileSync('src/app/settings/users-permissions.tsx', 'utf-8');

code = code.replace(
  "        onSuccess={() => {\n          setAddModalVisible(false);\n          loadData();\n        }}",
  "        onSuccess={() => {\n          setAddModalVisible(false);\n          console.log('[Users] RELOADING USERS');\n          loadData().then(() => console.log('[Users] USERS LOADED'));\n        }}"
);

fs.writeFileSync('src/app/settings/users-permissions.tsx', code);
