const fs = require('fs');
let content = fs.readFileSync('src/database/seed/demo/seedDemoData.ts', 'utf-8');

content = content.replace("import { seedDemoExpenses } from './seedExpenses';", "// import { seedDemoExpenses } from './seedExpenses';");
content = content.replace("expenses: number;", "// expenses: number;");
content = content.replace("const expenses = await seedDemoExpenses();", "// const expenses = 0;");
content = content.replace("expenses,", "// expenses,");

fs.writeFileSync('src/database/seed/demo/seedDemoData.ts', content);
