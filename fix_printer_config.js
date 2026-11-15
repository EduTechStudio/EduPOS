const fs = require('fs');
let code = fs.readFileSync('src/services/printer/PrinterManager.ts', 'utf-8');

if (!code.includes("authorizationService.requirePermission('printer.manage')")) {
  code = code.replace(
    "import { defaultPrinterConfig } from '../../config/defaultPrinterConfig';",
    "import { defaultPrinterConfig } from '../../config/defaultPrinterConfig';\nimport { authorizationService } from '../auth/AuthorizationService';"
  );
  
  code = code.replace(
    "async saveConfig(config: PrinterConfig): Promise<void> {",
    "async saveConfig(config: PrinterConfig): Promise<void> {\n    authorizationService.requirePermission('printer.manage');"
  );
  fs.writeFileSync('src/services/printer/PrinterManager.ts', code);
}
