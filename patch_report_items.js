const fs = require('fs');
let content = fs.readFileSync('src/services/report/ReportService.ts', 'utf-8');

// Add to interface
content = content.replace("totalDiscount: number;", "totalDiscount: number;\n  totalItemsSold: number;");

// Find where avgBasketSize is calculated
content = content.replace(
  "const avgBasketSize = completedCount > 0 ? Math.round(grossSales / completedCount) : 0;",
  `const avgBasketSize = completedCount > 0 ? Math.round(grossSales / completedCount) : 0;
    
    // Aggregate items sold
    const itemsStats = await db.getFirstAsync<{ total_items: number }>(
      \`SELECT SUM(ti.quantity) as total_items
       FROM transaction_items ti
       INNER JOIN transactions t ON ti.transaction_id = t.id
       \${whereClause.replace('created_at', 't.created_at')} AND t.status = 'COMPLETED';\`,
      ...params
    );
    const totalItemsSold = itemsStats?.total_items || 0;`
);

// Add to return
content = content.replace("totalDiscount,\n    };\n  }", "totalDiscount,\n      totalItemsSold,\n    };\n  }");

fs.writeFileSync('src/services/report/ReportService.ts', content);
