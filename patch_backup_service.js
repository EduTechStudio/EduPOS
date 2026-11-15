const fs = require('fs');
let code = fs.readFileSync('src/services/backup/BackupService.ts', 'utf-8');

if (!code.includes("authorizationService")) {
  code = code.replace(
    "import * as FileSystem from 'expo-file-system';",
    "import * as FileSystem from 'expo-file-system';\nimport { authorizationService } from '../auth/AuthorizationService';"
  );
  
  code = code.replace(
    "async createBackup(): Promise<BackupInfo> {",
    "async createBackup(): Promise<BackupInfo> {\n    authorizationService.requirePermission('backup.create');"
  );
  
  code = code.replace(
    "async restoreBackup(backupPath: string): Promise<void> {",
    "async restoreBackup(backupPath: string): Promise<void> {\n    authorizationService.requirePermission('backup.restore');"
  );
  
  code = code.replace(
    "async resetDatabase(): Promise<void> {",
    "async resetDatabase(): Promise<void> {\n    authorizationService.requirePermission('database.reset');"
  );

  fs.writeFileSync('src/services/backup/BackupService.ts', code);
}
