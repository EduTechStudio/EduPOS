const fs = require('fs');
let code = fs.readFileSync('src/app/settings/users-permissions.tsx', 'utf-8');

code = code.replace(
  "<ScreenContainer>",
  "<ScreenContainer scrollable={false}>"
);

fs.writeFileSync('src/app/settings/users-permissions.tsx', code);
