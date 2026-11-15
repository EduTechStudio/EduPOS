const fs = require('fs');
const { execSync } = require('child_process');

function extractSql(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const upMatch = content.match(/up:\s*\[([\s\S]*?)\]\s*};?/);
  if (!upMatch) return [];
  const arrayStr = '[' + upMatch[1] + ']';
  try {
    const sqls = eval(arrayStr);
    return sqls;
  } catch(e) {
    console.error(e);
    return [];
  }
}

const m1 = extractSql('src/database/migrations/001_initial_schema.ts');
const m2 = extractSql('src/database/migrations/002_payment_gateway.ts');

fs.writeFileSync('m1.sql', m1.join(';\n') + ';');
fs.writeFileSync('m2.sql', m2.join(';\n') + ';');

try {
  execSync('rm -f test_pos.db');
  console.log("Running migration 1...");
  execSync('sqlite3 test_pos.db < m1.sql');
  
  execSync(`sqlite3 test_pos.db "INSERT INTO transactions (id, transaction_number, status, subtotal, discount_amount, tax_amount, total_amount, payment_status, created_at, updated_at) VALUES ('tx_1', 'TRX-01', 'COMPLETED', 1000, 0, 0, 1000, 'PAID', 'now', 'now');"`);
  execSync(`sqlite3 test_pos.db "INSERT INTO payments (id, transaction_id, payment_method, amount, received_amount, change_amount, status, created_at, updated_at) VALUES ('pay_1', 'tx_1', 'cash', 1000, 1000, 0, 'PAID', 'now', 'now');"`);
  
  console.log("Running migration 2...");
  execSync('sqlite3 test_pos.db < m2.sql');
  
  console.log("Schema for transactions:");
  console.log(execSync('sqlite3 test_pos.db "PRAGMA table_info(transactions);"').toString());
  
  console.log("Schema for payments:");
  console.log(execSync('sqlite3 test_pos.db "PRAGMA table_info(payments);"').toString());
  
  console.log("Transaction records:");
  console.log(execSync('sqlite3 test_pos.db "SELECT * FROM transactions;"').toString());

  console.log("Payment records:");
  console.log(execSync('sqlite3 test_pos.db "SELECT * FROM payments;"').toString());
  
  console.log("Temp tables cleanup check:");
  console.log(execSync('sqlite3 test_pos.db "SELECT name FROM sqlite_master WHERE name LIKE \'%new%\';"').toString());

} catch (err) {
  console.error(err.message);
}
