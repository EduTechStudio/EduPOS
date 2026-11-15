const fs = require('fs');
let layout = fs.readFileSync('src/app/_layout.tsx', 'utf-8');
layout = layout.replace(
  'options={{ unmountOnBlur: true, title: "Settings"',
  'options={{ href: "/settings", unmountOnBlur: true, title: "Settings"'
);
fs.writeFileSync('src/app/_layout.tsx', layout);
