const fs = require('fs');
let content = fs.readFileSync('src/database/seed.ts', 'utf-8');

// Remove Categories
content = content.replace(
  /\/\/ 5\. Seed Default Categories[\s\S]*?\/\/ 8\. Seed Default Settings/,
  '// 5. (Categories removed, now handled by explicit Demo Seed)\n\n    // 6. (Products removed)\n\n    // 7. (Customers removed)\n\n    // 8. Seed Default Settings'
);

fs.writeFileSync('src/database/seed.ts', content);
