const fs = require('fs');
let content = fs.readFileSync('src/app/settings/system-configuration/database-maintenance.tsx', 'utf-8');

content = content.replace(
  "                // Re-initialize default required data\n                await seedDatabase(dbClient);\n              });",
  "              });\n              \n              // Re-initialize default required data outside the delete transaction\n              await seedDatabase(db);"
);

fs.writeFileSync('src/app/settings/system-configuration/database-maintenance.tsx', content);
