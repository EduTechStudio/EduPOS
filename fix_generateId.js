const fs = require('fs');
let file = fs.readFileSync('src/services/pos/DraftService.ts', 'utf-8');
file = file.replace("import { generateId } from '@/utils/generateId';", "");
file = file.replace(/generateId\('drf'\)/g, "('drf_' + Date.now())");
file = file.replace(/generateId\('dsi'\)/g, "('dsi_' + Date.now() + Math.random().toString(36).substring(7))");
fs.writeFileSync('src/services/pos/DraftService.ts', file);
