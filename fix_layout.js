const fs = require('fs');
let content = fs.readFileSync('src/app/_layout.tsx', 'utf-8');

// Replace the weird syntax
content = content.replace(/,\s*\}\}\s*\/>\s*<Tabs\.Screen\s*name="customers"/g, '<Tabs.Screen name="customers"');

fs.writeFileSync('src/app/_layout.tsx', content);
