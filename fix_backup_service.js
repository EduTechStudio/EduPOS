const fs = require('fs');
let content = fs.readFileSync('src/services/backup/BackupService.ts', 'utf-8');
content = content.replace(/archiveType: 'full',\n        archiveType: 'transaction_archive',/g, "archiveType: 'transaction_archive',");
content = content.replace(/archiveType: 'transaction_archive',\n        archiveType: 'full',/g, "archiveType: 'transaction_archive',");
fs.writeFileSync('src/services/backup/BackupService.ts', content);
