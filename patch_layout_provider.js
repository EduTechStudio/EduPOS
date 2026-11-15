const fs = require('fs');
let content = fs.readFileSync('src/app/_layout.tsx', 'utf-8');
content = content.replace("import { DatabaseService } from '@/database';", "import { DatabaseService } from '@/database';\nimport { POSProvider } from '@/context/POSContext';");
content = content.replace("<SafeAreaProvider>", "<SafeAreaProvider>\n      <POSProvider>");
content = content.replace("</SafeAreaProvider>", "      </POSProvider>\n    </SafeAreaProvider>");
fs.writeFileSync('src/app/_layout.tsx', content);
