const fs = require('fs');

const files = [
  'src/app/settings/system-configuration/backup-restore.tsx',
  'src/app/settings/system-configuration/database-maintenance.tsx',
  'src/app/settings/system-configuration/transaction-archive.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
}
