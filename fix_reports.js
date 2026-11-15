const fs = require('fs');
let rep = fs.readFileSync('src/app/reports.tsx', 'utf-8');
rep = rep.replace(/<StatCard\s*title="Laba Bersih \(Est\.\)"[\s\S]*?\/>/, '');
fs.writeFileSync('src/app/reports.tsx', rep);
