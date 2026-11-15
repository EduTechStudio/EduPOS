const fs = require('fs');
let content = fs.readFileSync('src/app/pos.tsx', 'utf-8');

content = content.replace(
  /\}?\s*\)\}\s*<\/TouchableOpacity>/g,
  ""
);

fs.writeFileSync('src/app/pos.tsx', content);
