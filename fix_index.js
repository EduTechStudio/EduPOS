const fs = require('fs');
let content = fs.readFileSync('src/app/index.tsx', 'utf-8');

// The file has trend={\`Discounts: \${...}\`}
// We want trend={`Discounts: ${...}`}
content = content.replace(/trend=\\{\\\`Discounts: \\\\?\\\$?{([^}]+)}\\\`}/, "trend={`Discounts: ${$1}`}");
content = content.replace(/trend=\\\`Discounts: \\\$\\{formatCurrency\\(summary\\?\\.totalDiscount \\|\\| 0\\)\\}/, 'trend={`Discounts: ${formatCurrency(summary?.totalDiscount || 0)}`}');

// A simpler brute force since we know exactly what it says
content = content.replace(/trend=\{`Discounts.*/, 'trend={`Discounts: ${formatCurrency(summary?.totalDiscount || 0)}`}');
content = content.replace(/trend=\{\\?`Discounts.*/, 'trend={`Discounts: ${formatCurrency(summary?.totalDiscount || 0)}`}');

fs.writeFileSync('src/app/index.tsx', content);
