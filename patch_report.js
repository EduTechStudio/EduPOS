const fs = require('fs');
let content = fs.readFileSync('src/services/report/ReportService.ts', 'utf-8');

// Remove aggregate expenses completely
const expenseBlock = `    // Aggregate expenses
    const expConditions: string[] = [];
    const expParams: any[] = [];
    if (startDate) {
      expConditions.push('expense_date >= ?');
      expParams.push(startDate);
    }
    if (endDate) {
      expConditions.push('expense_date <= ?');
      expParams.push(endDate);
    }
    const expWhereClause = expConditions.length > 0 ? \`WHERE \${expConditions.join(' AND ')}\` : '';

    const expStats = await db.getFirstAsync<{ total_expenses: number }>(
      \`SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses \${expWhereClause};\`,
      expParams
    );
`;

content = content.replace(expenseBlock, '');

// Save it
fs.writeFileSync('src/services/report/ReportService.ts', content);
