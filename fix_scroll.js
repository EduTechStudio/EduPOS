const fs = require('fs');
let code = fs.readFileSync('src/app/settings/users-permissions.tsx', 'utf-8');

code = code.replace(
  "return (\n    <ScreenContainer>\n      <SectionHeader",
  "return (\n    <ScreenContainer scrollable={false}>\n      <SectionHeader"
);

fs.writeFileSync('src/app/settings/users-permissions.tsx', code);
