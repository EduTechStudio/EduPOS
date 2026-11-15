const fs = require('fs');
let content = fs.readFileSync('src/app/_layout.tsx', 'utf-8');

content = content.replace(
  /<Tabs\.Screen name="settings"\s*options=\{\{/,
  '<Tabs.Screen name="settings" options={{ unmountOnBlur: true,'
);
fs.writeFileSync('src/app/_layout.tsx', content);
