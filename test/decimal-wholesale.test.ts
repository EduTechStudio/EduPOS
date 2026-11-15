import { migration008 } from '../src/database/migrations/008_wholesale_pricing';
import {
  parseQuantityInput,
  isValidQuantityInput,
  formatQuantity,
  calculateLineSubtotal,
  resolveTierUnitPrice,
} from '../src/utils/quantity';
import {
  TABLE_SCHEMAS,
  BACKUP_TABLE_MAPPING,
  TABLE_DEFAULTS,
  BackupService,
  BackupData,
} from '../src/services/backup/BackupService';

function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

assert.strictEqual = function <T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
  }
};

assert.notStrictEqual = function <T>(actual: T, expected: T, message?: string) {
  if (actual === expected) {
    throw new Error(`${message || 'Assertion failed'}: expected values to differ, got ${actual}`);
  }
};

assert.ok = function (val: any, message?: string): asserts val {
  if (!val) {
    throw new Error(message || 'Expected truthy value');
  }
};

assert.deepStrictEqual = function <T>(actual: T, expected: T, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message || 'Assertion failed'}: expected objects to match deep equality\nActual: ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`);
  }
};

console.log('--- STARTING EDUPOS DECIMAL QUANTITY & WHOLESALE FOUNDATION TESTS ---');

// =========================================================================
// TEST 1: Migration 008 Definition & Structure
// =========================================================================
console.log('Testing Test 1: Migration 008 definition and SQL statements...');
{
  assert.strictEqual(migration008.id, 8, 'Migration ID must be 8');
  assert.strictEqual(migration008.name, '008_wholesale_pricing', 'Migration name must match');
  assert.ok(Array.isArray(migration008.up), 'Migration up must be an array of statements');
  assert.strictEqual(migration008.up.length, 3, 'Migration up must contain 3 statements (table + 2 indexes)');

  const tableSql = migration008.up[0];
  assert.ok(tableSql.includes('CREATE TABLE IF NOT EXISTS product_price_tiers'), 'Must create product_price_tiers table');
  assert.ok(tableSql.includes('id TEXT PRIMARY KEY NOT NULL'), 'Must have id primary key');
  assert.ok(tableSql.includes('product_id TEXT NOT NULL'), 'Must reference product_id');
  assert.ok(tableSql.includes('min_quantity REAL NOT NULL'), 'Must declare min_quantity as REAL');
  assert.ok(tableSql.includes('unit_price INTEGER NOT NULL'), 'Must declare unit_price as INTEGER');
  assert.ok(tableSql.includes('FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE'), 'Must cascade delete on product');
  assert.ok(tableSql.includes('UNIQUE (product_id, min_quantity)'), 'Must have UNIQUE constraint on (product_id, min_quantity)');

  const index1 = migration008.up[1];
  assert.ok(index1.includes('idx_price_tiers_product_id'), 'Must create product_id index');

  const index2 = migration008.up[2];
  assert.ok(index2.includes('idx_price_tiers_min_qty'), 'Must create min_quantity index');

  console.log('  PASS: Migration 008 structure and SQL constraints verified.');
}

// =========================================================================
// TEST 2: Integer Quantity Parsing
// =========================================================================
console.log('Testing Test 2: Integer quantity parsing...');
{
  assert.strictEqual(parseQuantityInput('1'), 1, 'Integer "1" must parse to 1');
  assert.strictEqual(parseQuantityInput('25'), 25, 'Integer "25" must parse to 25');
  assert.strictEqual(parseQuantityInput('0'), 0, 'Zero "0" must parse to 0');
  assert.strictEqual(parseQuantityInput('  100  '), 100, 'Trimmed "  100  " must parse to 100');

  // allowDecimal: false must parse clean integers
  assert.strictEqual(parseQuantityInput('5', { allowDecimal: false }), 5, 'Integer must parse when allowDecimal is false');
  // allowDecimal: false must reject decimals
  assert.strictEqual(parseQuantityInput('5.5', { allowDecimal: false }), null, 'Decimal must be rejected when allowDecimal is false');
  assert.strictEqual(parseQuantityInput('5,5', { allowDecimal: false }), null, 'Comma decimal must be rejected when allowDecimal is false');

  console.log('  PASS: Integer quantity parsing verified.');
}

// =========================================================================
// TEST 3: Decimal Quantity Parsing (Dot & Indonesian Comma)
// =========================================================================
console.log('Testing Test 3: Decimal quantity parsing (0.471 and 0,471)...');
{
  assert.strictEqual(parseQuantityInput('0.471'), 0.471, 'Standard dot "0.471" must parse to 0.471');
  assert.strictEqual(parseQuantityInput('0,471'), 0.471, 'Indonesian comma "0,471" must parse to 0.471');
  assert.strictEqual(parseQuantityInput('1.5'), 1.5, 'Standard dot "1.5" must parse to 1.5');
  assert.strictEqual(parseQuantityInput('1,5'), 1.5, 'Indonesian comma "1,5" must parse to 1.5');
  assert.strictEqual(parseQuantityInput('12.345'), 12.345, 'Multi-digit "12.345" must parse to 12.345');
  assert.strictEqual(parseQuantityInput('12,345'), 12.345, 'Multi-digit "12,345" must parse to 12.345');

  // Clamping to 3 decimal places
  assert.strictEqual(parseQuantityInput('0.4714'), 0.471, 'Must clamp 0.4714 to 0.471');
  assert.strictEqual(parseQuantityInput('0.4718'), 0.472, 'Must round 0.4718 to 0.472');

  // isValidQuantityInput check
  assert.strictEqual(isValidQuantityInput('0.471'), true, '0.471 is valid positive quantity');
  assert.strictEqual(isValidQuantityInput('0,471'), true, '0,471 is valid positive quantity');
  assert.strictEqual(isValidQuantityInput('0'), false, '0 is not strictly positive');

  console.log('  PASS: Decimal quantity parsing and locale comma support verified.');
}

// =========================================================================
// TEST 4: Invalid, Empty, Negative, and Malformed Quantities
// =========================================================================
console.log('Testing Test 4: Rejection of invalid, negative, empty, and malformed inputs...');
{
  assert.strictEqual(parseQuantityInput(''), null, 'Empty string must return null');
  assert.strictEqual(parseQuantityInput('   '), null, 'Whitespace must return null');
  assert.strictEqual(parseQuantityInput(null), null, 'null must return null');
  assert.strictEqual(parseQuantityInput(undefined), null, 'undefined must return null');

  // Negative numbers
  assert.strictEqual(parseQuantityInput('-1'), null, 'Negative integer "-1" must return null');
  assert.strictEqual(parseQuantityInput('-0.471'), null, 'Negative decimal "-0.471" must return null');
  assert.strictEqual(parseQuantityInput('-0,471'), null, 'Negative decimal "-0,471" must return null');

  // Multiple or malformed separators
  assert.strictEqual(parseQuantityInput('0.4.1'), null, 'Multiple dots "0.4.1" must return null');
  assert.strictEqual(parseQuantityInput('1,2,3'), null, 'Multiple commas "1,2,3" must return null');
  assert.strictEqual(parseQuantityInput('1.2,3'), null, 'Mixed separators "1.2,3" must return null');
  assert.strictEqual(parseQuantityInput('0..5'), null, 'Double dot "0..5" must return null');
  assert.strictEqual(parseQuantityInput('.'), null, 'Standalone dot must return null');
  assert.strictEqual(parseQuantityInput(','), null, 'Standalone comma must return null');

  // Non-numeric text
  assert.strictEqual(parseQuantityInput('abc'), null, 'Text "abc" must return null');
  assert.strictEqual(parseQuantityInput('12a'), null, 'Text "12a" must return null');
  assert.strictEqual(parseQuantityInput('2 kg'), null, 'Text "2 kg" must return null');

  // Out of bounds
  assert.strictEqual(parseQuantityInput('150', { max: 100 }), null, 'Value exceeding max must return null');
  assert.strictEqual(parseQuantityInput('0.5', { min: 1 }), null, 'Value below min must return null');

  console.log('  PASS: Invalid, empty, negative, and malformed inputs rejected safely.');
}

// =========================================================================
// TEST 5: Quantity Display Formatting
// =========================================================================
console.log('Testing Test 5: Quantity formatting for display and receipts...');
{
  assert.strictEqual(formatQuantity(1), '1', 'Integer 1 formats as "1"');
  assert.strictEqual(formatQuantity(25), '25', 'Integer 25 formats as "25"');
  assert.strictEqual(formatQuantity(0), '0', 'Integer 0 formats as "0"');
  assert.strictEqual(formatQuantity(0.471), '0.471', 'Decimal 0.471 formats as "0.471"');
  assert.strictEqual(formatQuantity(1.5), '1.5', 'Decimal 1.5 formats as "1.5" (no trailing 0)');
  assert.strictEqual(formatQuantity(1.500), '1.5', 'Decimal 1.500 trims trailing zeros to "1.5"');
  assert.strictEqual(formatQuantity(12.3456), '12.346', 'Rounds to 3 decimals');

  // Unit appending
  assert.strictEqual(formatQuantity(0.471, { unit: 'kg' }), '0.471 kg', 'Appends unit "kg"');
  assert.strictEqual(formatQuantity(5, { unit: 'pcs' }), '5 pcs', 'Appends unit "pcs"');

  // Fallbacks for falsy / invalid values
  assert.strictEqual(formatQuantity(null), '0', 'null formats as "0"');
  assert.strictEqual(formatQuantity(undefined), '0', 'undefined formats as "0"');
  assert.strictEqual(formatQuantity(NaN), '0', 'NaN formats as "0"');

  console.log('  PASS: Quantity formatting verified.');
}

// =========================================================================
// TEST 6: Deterministic Financial Line Subtotal Rounding
// =========================================================================
console.log('Testing Test 6: Deterministic line subtotal rounding (integer Rupiah)...');
{
  // Exact integer multiplication
  assert.strictEqual(calculateLineSubtotal(1000, 5), 5000, '1000 * 5 = 5000');

  // Exact decimal multiplication (weight example from specification)
  // Price = Rp20,000/kg; quantity = 0.471 kg; line total = Rp9,420
  assert.strictEqual(calculateLineSubtotal(20000, 0.471), 9420, '20000 * 0.471 = 9420');

  // Fractional result half-up rounding:
  // 19999 * 0.471 = 9419.529 -> rounds to 9420
  assert.strictEqual(calculateLineSubtotal(19999, 0.471), 9420, '19999 * 0.471 = 9420 (half-up)');

  // 15500 * 0.333 = 5161.5 -> rounds to 5162
  assert.strictEqual(calculateLineSubtotal(15500, 0.333), 5162, '15500 * 0.333 = 5162 (half-up)');

  // Edge cases
  assert.strictEqual(calculateLineSubtotal(0, 5), 0, 'Zero price produces 0');
  assert.strictEqual(calculateLineSubtotal(1000, 0), 0, 'Zero quantity produces 0');
  assert.strictEqual(calculateLineSubtotal(-1000, 5), 0, 'Negative price guarded to 0');
  assert.strictEqual(calculateLineSubtotal(1000, -5), 0, 'Negative quantity guarded to 0');

  console.log('  PASS: Deterministic line subtotal integer Rupiah rounding verified.');
}

// =========================================================================
// TEST 7: Deterministic Wholesale Tier Selection
// =========================================================================
console.log('Testing Test 7: Deterministic wholesale tier evaluation...');
{
  const basePrice = 1000;
  const tiers = [
    { min_quantity: 10, unit_price: 900 },
    { min_quantity: 20, unit_price: 800 },
  ];

  // 1-9 pcs: Base price
  const res5 = resolveTierUnitPrice(basePrice, tiers, 5);
  assert.strictEqual(res5.unitPrice, 1000, 'Qty 5 qualifies for base price');
  assert.strictEqual(res5.activeTier, null, 'No active tier for qty 5');

  const res9 = resolveTierUnitPrice(basePrice, tiers, 9);
  assert.strictEqual(res9.unitPrice, 1000, 'Qty 9 qualifies for base price');
  assert.strictEqual(res9.activeTier, null, 'No active tier for qty 9');

  // 10-19 pcs: Tier 1 (Rp900)
  const res10 = resolveTierUnitPrice(basePrice, tiers, 10);
  assert.strictEqual(res10.unitPrice, 900, 'Qty 10 qualifies for tier 1 (Rp900)');
  assert.strictEqual(res10.activeTier?.unit_price, 900, 'Active tier is Rp900');

  const res19 = resolveTierUnitPrice(basePrice, tiers, 19);
  assert.strictEqual(res19.unitPrice, 900, 'Qty 19 qualifies for tier 1 (Rp900)');

  // 20+ pcs: Tier 2 (Rp800)
  const res20 = resolveTierUnitPrice(basePrice, tiers, 20);
  assert.strictEqual(res20.unitPrice, 800, 'Qty 20 qualifies for tier 2 (Rp800)');

  const res50 = resolveTierUnitPrice(basePrice, tiers, 50);
  assert.strictEqual(res50.unitPrice, 800, 'Qty 50 qualifies for tier 2 (Rp800)');

  // Tiers passed unsorted: must still sort descending and match correctly
  const unsortedTiers = [
    { min_quantity: 20, unit_price: 800 },
    { min_quantity: 10, unit_price: 900 },
  ];
  const resUnsorted = resolveTierUnitPrice(basePrice, unsortedTiers, 25);
  assert.strictEqual(resUnsorted.unitPrice, 800, 'Unsorted tiers resolve highest matching threshold');

  // Fractional threshold tier (e.g. min 2.5 kg at Rp18.000)
  const weightTiers = [
    { min_quantity: 2.5, unit_price: 18000 },
    { min_quantity: 5.0, unit_price: 16000 },
  ];
  const resWeight1 = resolveTierUnitPrice(20000, weightTiers, 1.5);
  assert.strictEqual(resWeight1.unitPrice, 20000, '1.5 kg qualifies for base price');

  const resWeight2 = resolveTierUnitPrice(20000, weightTiers, 2.5);
  assert.strictEqual(resWeight2.unitPrice, 18000, '2.5 kg qualifies for 2.5 kg tier');

  const resWeight3 = resolveTierUnitPrice(20000, weightTiers, 3.2);
  assert.strictEqual(resWeight3.unitPrice, 18000, '3.2 kg qualifies for 2.5 kg tier');

  const resWeight4 = resolveTierUnitPrice(20000, weightTiers, 6.0);
  assert.strictEqual(resWeight4.unitPrice, 16000, '6.0 kg qualifies for 5.0 kg tier');

  console.log('  PASS: Deterministic wholesale tier selection verified.');
}

// =========================================================================
// TEST 8: BackupService Schema & Mapping Verification
// =========================================================================
console.log('Testing Test 8: BackupService schema definition, decimalFields, and mappings...');
{
  // Verify decimalFields exists on relevant tables
  const prodSchema = TABLE_SCHEMAS['products'];
  assert.ok(prodSchema.decimalFields?.includes('current_stock'), 'products.decimalFields must include current_stock');
  assert.ok(prodSchema.decimalFields?.includes('minimum_stock'), 'products.decimalFields must include minimum_stock');
  // Integer fields must preserve financial and boolean fields
  assert.ok(prodSchema.integerFields?.includes('purchase_price'), 'products.integerFields must preserve purchase_price');
  assert.ok(prodSchema.integerFields?.includes('selling_price'), 'products.integerFields must preserve selling_price');
  assert.ok(prodSchema.integerFields?.includes('stock_tracking'), 'products.integerFields must preserve stock_tracking');
  assert.ok(prodSchema.integerFields?.includes('is_active'), 'products.integerFields must preserve is_active');
  assert.ok(!prodSchema.integerFields?.includes('current_stock'), 'products.integerFields must NOT include current_stock');

  // Transaction items
  const tiSchema = TABLE_SCHEMAS['transaction_items'];
  assert.ok(tiSchema.decimalFields?.includes('quantity'), 'transaction_items.decimalFields must include quantity');
  assert.ok(tiSchema.integerFields?.includes('unit_price'), 'transaction_items.integerFields must preserve unit_price');
  assert.ok(tiSchema.integerFields?.includes('subtotal'), 'transaction_items.integerFields must preserve subtotal');
  assert.ok(!tiSchema.integerFields?.includes('quantity'), 'transaction_items.integerFields must NOT include quantity');

  // Stock movements
  const smSchema = TABLE_SCHEMAS['stock_movements'];
  assert.ok(smSchema.decimalFields?.includes('quantity'), 'stock_movements.decimalFields must include quantity');
  assert.ok(!smSchema.integerFields?.includes('quantity'), 'stock_movements.integerFields must NOT include quantity');

  // Wholesale pricing tiers table
  const ptSchema = TABLE_SCHEMAS['product_price_tiers'];
  assert.ok(ptSchema !== undefined, 'product_price_tiers schema must be defined');
  assert.strictEqual(ptSchema.tableName, 'product_price_tiers');
  assert.ok(ptSchema.decimalFields?.includes('min_quantity'), 'product_price_tiers.decimalFields must include min_quantity');
  assert.ok(ptSchema.integerFields?.includes('unit_price'), 'product_price_tiers.integerFields must include unit_price');

  // Table mapping & defaults
  assert.strictEqual(BACKUP_TABLE_MAPPING['productPriceTiers'], 'product_price_tiers');
  assert.ok(TABLE_DEFAULTS['product_price_tiers'] !== undefined);

  console.log('  PASS: BackupService schema definition and field segregation verified.');
}

// =========================================================================
// TEST 9: Backup Table Data Validation (Decimal vs Integer Integrity)
// =========================================================================
console.log('Testing Test 9: BackupService validation for decimal stock and integer constraints...');
{
  const service = new BackupService();

  const runValidation = (dataPatch: Partial<BackupData['data']>) => {
    const data: any = {
      categories: [],
      products: [{ id: 'prod_1', sku: 'APL-001', name: 'Apel Fuji', purchase_price: 15000, selling_price: 20000, stock_tracking: 1, current_stock: 10, minimum_stock: 2, is_active: 1, created_at: '2026-10-24T12:00:00Z', updated_at: '2026-10-24T12:00:00Z' }],
      customers: [],
      roles: [],
      users: [],
      permissions: [],
      rolePermissions: [],
      userPermissions: [],
      draftSales: [],
      draftSaleItems: [],
      transactions: [{ id: 'tx_1', transaction_number: 'TRX-1', status: 'COMPLETED', subtotal: 9420, discount_amount: 0, tax_amount: 0, total_amount: 9420, payment_status: 'PAID', created_at: '2026-10-24T12:00:00Z', updated_at: '2026-10-24T12:00:00Z' }],
      transactionItems: [],
      payments: [],
      stockMovements: [],
      expenses: [],
      settings: [],
      productPriceTiers: [],
      ...dataPatch,
    };
    service.validateBackupDataRecords({ metadata: { archiveType: 'full' } as any, data });
  };

  // 1. Transaction items with decimal quantity (e.g. 0.471 kg) must PASS
  const validDecimalItems = [
    {
      id: 'ti_1',
      transaction_id: 'tx_1',
      product_name_snapshot: 'Apel Fuji',
      quantity: 0.471,
      unit_price: 20000,
      discount_amount: 0,
      subtotal: 9420,
      created_at: '2026-10-24T12:00:00Z',
    },
    {
      id: 'ti_2',
      transaction_id: 'tx_1',
      product_name_snapshot: 'Buku Tulis',
      quantity: 5, // Integer also valid as numeric
      unit_price: 5000,
      discount_amount: 0,
      subtotal: 25000,
      created_at: '2026-10-24T12:00:00Z',
    },
  ];

  let passed = true;
  try {
    runValidation({ transactionItems: validDecimalItems });
  } catch (err: any) {
    passed = false;
    throw new Error(`Valid decimal items failed validation: ${err.message}`);
  }
  assert.ok(passed, 'Decimal transaction items must pass validation');

  // 2. Transaction items with fractional unit_price (illegal) must FAIL
  const invalidUnitPriceItems = [
    {
      id: 'ti_3',
      transaction_id: 'tx_1',
      product_name_snapshot: 'Apel Fuji',
      quantity: 0.471,
      unit_price: 20000.5, // Illegal fractional currency!
      discount_amount: 0,
      subtotal: 9420,
      created_at: '2026-10-24T12:00:00Z',
    },
  ];

  let threwIntegerError = false;
  try {
    runValidation({ transactionItems: invalidUnitPriceItems });
  } catch (err: any) {
    threwIntegerError = err.message.includes('unit_price') && err.message.includes('integer');
  }
  assert.ok(threwIntegerError, 'Fractional unit_price must be rejected by integer validation');

  // 3. Products with decimal stock (e.g. 9.529 kg) must PASS
  const validDecimalProducts = [
    {
      id: 'prod_1',
      sku: 'APL-001',
      name: 'Apel Fuji',
      purchase_price: 15000,
      selling_price: 20000,
      stock_tracking: 1,
      current_stock: 9.529,
      minimum_stock: 2.5,
      is_active: 1,
      created_at: '2026-10-24T12:00:00Z',
      updated_at: '2026-10-24T12:00:00Z',
    },
  ];

  passed = true;
  try {
    runValidation({ products: validDecimalProducts });
  } catch (err: any) {
    passed = false;
    throw new Error(`Valid decimal products failed validation: ${err.message}`);
  }
  assert.ok(passed, 'Decimal stock products must pass validation');

  // 4. Products with fractional selling_price must FAIL
  const invalidPriceProduct = [
    {
      id: 'prod_1',
      sku: 'APL-001',
      name: 'Apel Merah',
      purchase_price: 15000,
      selling_price: 20000.75, // Illegal fractional price!
      stock_tracking: 1,
      current_stock: 10,
      minimum_stock: 2,
      is_active: 1,
      created_at: '2026-10-24T12:00:00Z',
      updated_at: '2026-10-24T12:00:00Z',
    },
  ];

  threwIntegerError = false;
  try {
    runValidation({ products: invalidPriceProduct });
  } catch (err: any) {
    threwIntegerError = err.message.includes('selling_price') && err.message.includes('integer');
  }
  assert.ok(threwIntegerError, 'Fractional selling_price must be rejected by integer validation');

  // 5. Wholesale tiers table data validation
  const validTiers = [
    {
      id: 'tier_1',
      product_id: 'prod_1',
      min_quantity: 2.5,
      unit_price: 18000,
      created_at: '2026-10-24T12:00:00Z',
      updated_at: '2026-10-24T12:00:00Z',
    },
  ];
  passed = true;
  try {
    runValidation({ productPriceTiers: validTiers });
  } catch (err: any) {
    passed = false;
    throw new Error(`Valid wholesale tiers failed validation: ${err.message}`);
  }
  assert.ok(passed, 'Valid wholesale tiers must pass validation');

  console.log('  PASS: Backup table data validation preserves integers while supporting decimal quantities.');
}

// =========================================================================
// TEST 10: Backward Compatibility for Legacy Backups (Pre-Migration 008)
// =========================================================================
console.log('Testing Test 10: Backward compatibility for backups without productPriceTiers...');
async function runTest10() {
  const service = new BackupService();

  // Construct a simulated legacy backup (e.g. from Schema Version 7 without productPriceTiers)
  const legacyBackup: BackupData = {
    metadata: {
      formatVersion: 2,
      appVersion: '1.0.2',
      schemaVersion: 7,
      createdAt: '2026-10-17T12:00:00Z',
      archiveType: 'full',
      counts: {
        categories: 0,
        products: 0,
        customers: 0,
        roles: 1,
        users: 1,
        permissions: 0,
        rolePermissions: 0,
        userPermissions: 0,
        draftSales: 0,
        draftSaleItems: 0,
        transactions: 0,
        transactionItems: 0,
        payments: 0,
        stockMovements: 0,
        expenses: 0,
        settings: 0,
        // productPriceTiers omitted entirely (legacy backup!)
      },
    },
    data: {
      categories: [],
      products: [],
      customers: [],
      roles: [
        {
          id: 'role_admin',
          name: 'Admin',
          description: null,
          is_system: 1,
          created_at: '2026-10-17T12:00:00Z',
          updated_at: '2026-10-17T12:00:00Z',
        },
      ],
      users: [
        {
          id: 'user_1',
          name: 'Owner',
          username: 'owner',
          pin_hash: '123456_hashed',
          role_id: 'role_admin',
          is_active: 1,
          created_at: '2026-10-17T12:00:00Z',
          updated_at: '2026-10-17T12:00:00Z',
        },
      ],
      permissions: [],
      rolePermissions: [],
      userPermissions: [],
      draftSales: [],
      draftSaleItems: [],
      transactions: [],
      transactionItems: [],
      payments: [],
      stockMovements: [],
      expenses: [],
      settings: [],
      // productPriceTiers omitted entirely
    },
  };

  // Mock file reader to return the legacy backup JSON
  (service as any).readBackupFileContent = async () => JSON.stringify(legacyBackup);

  const validationRes = await service.validateBackup('file://legacy-backup.json');
  assert.ok(validationRes.success, `Legacy backup must pass validation: ${validationRes.message}`);
  assert.strictEqual(validationRes.backup?.metadata.counts.productPriceTiers, 0, 'Legacy backup productPriceTiers count normalized to 0');
  assert.ok(Array.isArray(validationRes.backup?.data.productPriceTiers), 'Legacy backup productPriceTiers normalized to array');

  // Verify validateBackupDataRecords passes cleanly on legacy backup
  service.validateBackupDataRecords(legacyBackup);

  console.log('  PASS: Legacy backup without productPriceTiers handled with 100% backward compatibility.');
}

runTest10().then(() => {
  console.log('--- ALL DECIMAL QUANTITY & WHOLESALE FOUNDATION TESTS PASSED (10/10) ---');
}).catch((err) => {
  console.error('Test 10 failed:', err);
  process.exit(1);
});
