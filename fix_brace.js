const fs = require('fs');
let code = fs.readFileSync('src/services/pos/DraftService.ts', 'utf-8');
code = code.replace("  }\n  }\n}\n\nexport const draftService", "  }\n}\n\nexport const draftService");
fs.writeFileSync('src/services/pos/DraftService.ts', code);
