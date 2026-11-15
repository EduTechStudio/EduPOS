import sqlite3
import re
import os

def extract_sql(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Just grab everything inside backticks. This is safe enough for these migration files.
    sqls = []
    for m in re.finditer(r'`(.*?)`', content, re.DOTALL):
        sqls.append(m.group(1))
    return sqls

m1_sqls = extract_sql('src/database/migrations/001_initial_schema.ts')
m2_sqls = extract_sql('src/database/migrations/002_payment_gateway.ts')

if os.path.exists('test_pos.db'):
    os.remove('test_pos.db')

conn = sqlite3.connect('test_pos.db')
cursor = conn.cursor()

try:
    print("Running migration 1 (statements:", len(m1_sqls), ")...")
    for sql in m1_sqls:
        cursor.execute(sql)
        
    print("Inserting mock data...")
    cursor.execute("""
      INSERT INTO transactions (id, transaction_number, status, subtotal, discount_amount, tax_amount, total_amount, payment_status, created_at, updated_at) 
      VALUES ('tx_1', 'TRX-01', 'COMPLETED', 1000, 0, 0, 1000, 'PAID', 'now', 'now')
    """)
    cursor.execute("""
      INSERT INTO payments (id, transaction_id, payment_method, amount, received_amount, change_amount, status, created_at, updated_at) 
      VALUES ('pay_1', 'tx_1', 'cash', 1000, 1000, 0, 'PAID', 'now', 'now')
    """)
    
    print("Running migration 2 (statements:", len(m2_sqls), ")...")
    for sql in m2_sqls:
        cursor.execute(sql)
        
    print("\n--- SCHEMA ---")
    cursor.execute("PRAGMA table_info(transactions)")
    print("transactions columns:")
    for row in cursor.fetchall():
        print(f"  {row[1]} ({row[2]})")
    
    cursor.execute("PRAGMA table_info(payments)")
    print("payments columns:")
    for row in cursor.fetchall():
        print(f"  {row[1]} ({row[2]})")
    
    print("\n--- DATA ---")
    cursor.execute("SELECT id, status, payment_status FROM transactions")
    print("transactions data:", cursor.fetchall())
    
    cursor.execute("SELECT id, payment_method, status, provider, gateway_payment_id FROM payments")
    print("payments data:", cursor.fetchall())
    
    print("\n--- CLEANUP ---")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%new%'")
    print("Temp tables left:", cursor.fetchall())
    
except Exception as e:
    print("Error:", e)
finally:
    conn.close()
