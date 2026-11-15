const fs = require('fs');
let content = fs.readFileSync('src/services/report/ReportService.ts', 'utf-8');
content = content.replace("whereClause.replace('created_at', 't.created_at')", "whereClause.replace(/created_at/g, 't.created_at')");
fs.writeFileSync('src/services/report/ReportService.ts', content);
