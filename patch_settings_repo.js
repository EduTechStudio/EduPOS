const fs = require('fs');
let code = fs.readFileSync('src/database/repositories/SettingsRepository.ts', 'utf-8');

if (!code.includes("authorizationService")) {
  code = code.replace(
    "import { SettingEntity } from '../types';",
    "import { SettingEntity } from '../types';\nimport { authorizationService } from '../../services/auth/AuthorizationService';"
  );
  
  const setMethodAuth = `
    if (key.includes('printer')) {
      authorizationService.requirePermission('printer.manage');
    } else if (key.includes('receipt')) {
      authorizationService.requirePermission('receipt.manage');
    } else if (key.includes('payment_gateway')) {
      authorizationService.requirePermission('payment.gateway.manage');
    } else {
      authorizationService.requirePermission('settings.manage');
    }`;

  code = code.replace(
    "async set(key: string, value: string, valueType: 'string' | 'number' | 'boolean' | 'json' = 'string'): Promise<void> {\n    const db = await getDatabase();",
    `async set(key: string, value: string, valueType: 'string' | 'number' | 'boolean' | 'json' = 'string'): Promise<void> {${setMethodAuth}\n    const db = await getDatabase();`
  );

  fs.writeFileSync('src/database/repositories/SettingsRepository.ts', code);
}
