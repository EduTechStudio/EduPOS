const fs = require('fs');
let code = fs.readFileSync('src/database/repositories/UserRepository.ts', 'utf-8');

code = code.replace("import { authorizationService } from '../../services/auth/AuthorizationService';\n", "");
code = code.replace(/authorizationService\.requirePermission\([^)]+\);\n\s*/g, "");

fs.writeFileSync('src/database/repositories/UserRepository.ts', code);
