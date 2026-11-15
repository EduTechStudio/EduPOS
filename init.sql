export interface Migration {
}

    // 1. Categories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );,

    // 2. Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT,
      sku TEXT NOT NULL UNIQUE,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      purchase_price INTEGER NOT NULL DEFAULT 0,
      selling_price INTEGER NOT NULL DEFAULT 0,
      stock_tracking INTEGER NOT NULL DEFAULT 1,
      current_stock INTEGER NOT NULL DEFAULT 0,
      minimum_stock INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'pcs',
      image_uri TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );,

    // Indexes for products
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);,
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);,
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);,

    // 3. Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );,

    // 4. Roles
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );,

    // 5. Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      role_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
    );,

    // 6. Permissions
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY NOT NULL,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );,

    // 7. Role Permissions (Join Table)
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    );,

    // 8. Transactions
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_number TEXT NOT NULL UNIQUE,
      customer_id TEXT,
      cashier_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('COMPLETED', 'CANCELLED', 'REFUNDED')),
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
    );,

    // Indexes for transactions
    CREATE INDEX IF NOT EXISTS idx_transactions_number ON transactions(transaction_number);,
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);,
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);,

    // 9. Transaction Items
    CREATE TABLE IF NOT EXISTS transaction_items (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_id TEXT NOT NULL,
      product_id TEXT,
      product_name_snapshot TEXT NOT NULL,
      sku_snapshot TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      subtotal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );,

    CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);,

    // 10. Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_id TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'qris', 'bank_transfer', 'debit')),
      amount INTEGER NOT NULL DEFAULT 0,
      received_amount INTEGER NOT NULL DEFAULT 0,
      change_amount INTEGER NOT NULL DEFAULT 0,
      reference_number TEXT,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
      paid_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );,

    CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);,

    // 11. Stock Movements
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY NOT NULL,
      product_id TEXT NOT NULL,
      movement_type TEXT NOT NULL CHECK(movement_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGE')),
      quantity INTEGER NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );,

    CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);,
    CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);,

    // 12. Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      expense_date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );,

    // 13. Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      value_type TEXT NOT NULL CHECK(value_type IN ('string', 'number', 'boolean', 'json')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );,
  ,
};
