const fs = require('fs');
let content = fs.readFileSync('src/app/settings/system-configuration/transaction-archive.tsx', 'utf-8');

content = content.replace("res[0].count", "(res as any[])[0].count");
content = content.replace("res[0].total", "(res as any[])[0].total");

fs.writeFileSync('src/app/settings/system-configuration/transaction-archive.tsx', content);
