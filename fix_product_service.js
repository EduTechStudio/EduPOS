const fs = require('fs');
let code = fs.readFileSync('src/services/product/ProductService.ts', 'utf-8');
if (!code.includes("import { authorizationService }")) {
  code = "import { authorizationService } from '../auth/AuthorizationService';\n" + code;
  fs.writeFileSync('src/services/product/ProductService.ts', code);
}
