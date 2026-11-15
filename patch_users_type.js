const fs = require('fs');
let code = fs.readFileSync('src/app/settings/users-permissions.tsx', 'utf-8');

code = code.replace(
  "const renderItem = ({ item }: { item: UserEntity & { roleName: string } }) => (",
  "const renderItem = ({ item }: { item: UserEntity & { roleName: string, hasCustom?: boolean } }) => ("
);

fs.writeFileSync('src/app/settings/users-permissions.tsx', code);
