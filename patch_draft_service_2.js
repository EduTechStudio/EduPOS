const fs = require('fs');
let code = fs.readFileSync('src/services/pos/DraftService.ts', 'utf-8');

code = code.replace(
  /async saveDraft\([\s\S]*?\)\: Promise<string> \{/,
  "$& \n    authorizationService.requirePermission('draft.create');"
);

code = code.replace(
  /async resumeDraft\([\s\S]*?\)\: Promise<DraftSaleDetail> \{/,
  "$& \n    authorizationService.requirePermission('draft.resume');"
);

fs.writeFileSync('src/services/pos/DraftService.ts', code);
