import { Migration } from './001_initial_schema';

export const migration002: Migration = {
  id: 2,
  name: 'Add Payment Gateway Architecture',
  up: [
    // Cleanup any lingering temp tables from previous failed runs
    `DROP TABLE IF EXISTS payments_new;`,
    `DROP TABLE IF EXISTS transactions_new;`,

    // Create new payments table without strict CHECK constraints and with new gateway columns
    `CREATE TABLE payments_new (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      received_amount INTEGER NOT NULL DEFAULT 0,
      change_amount INTEGER NOT NULL DEFAULT 0,
      reference_number TEXT,
      status TEXT NOT NULL,
      paid_at TEXT,
      notes TEXT,
      provider TEXT,
      gateway_payment_id TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );`,
    
    // Copy existing data using explicit column mapping
    `INSERT INTO payments_new (
      id, transaction_id, payment_method, amount, received_amount, change_amount, 
      reference_number, status, paid_at, notes, created_at, updated_at
    ) SELECT 
      id, transaction_id, payment_method, amount, received_amount, change_amount, 
      reference_number, status, paid_at, notes, created_at, updated_at
    FROM payments;`,
    
    // Drop old table and rename
    `DROP TABLE payments;`,
    `ALTER TABLE payments_new RENAME TO payments;`,
    
    // Recreate payments index (was dropped when payments table was dropped)
    `CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);`,
    
    // Create new transactions table preserving all original columns but without strict CHECK on payment_status
    `CREATE TABLE transactions_new (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_number TEXT NOT NULL UNIQUE,
      customer_id TEXT,
      cashier_id TEXT,
      status TEXT NOT NULL,
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
    );`,
    
    // Explicit insert matching old schema to new schema
    `INSERT INTO transactions_new (
      id, transaction_number, customer_id, cashier_id, status, subtotal, 
      discount_amount, tax_amount, total_amount, payment_status, notes, 
      created_at, updated_at
    ) SELECT 
      id, transaction_number, customer_id, cashier_id, status, subtotal, 
      discount_amount, tax_amount, total_amount, payment_status, notes, 
      created_at, updated_at
    FROM transactions;`,
    
    // Drop old table and rename
    `DROP TABLE transactions;`,
    `ALTER TABLE transactions_new RENAME TO transactions;`,
    
    // Recreate transaction indexes (were dropped when transactions table was dropped)
    `CREATE INDEX IF NOT EXISTS idx_transactions_number ON transactions(transaction_number);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);`
  ]
};
