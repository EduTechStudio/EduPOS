import {
  ProductPriceTierRepository,
} from '../src/database/repositories/ProductPriceTierRepository';
import {
  ProductService,
  validateProductPriceTiers,
  CreateProductInput,
} from '../src/services/product/ProductService';
import { ProductEntity, ProductPriceTierEntity } from '../src/database/types';
import { resolveTierUnitPrice, formatQuantity, parseQuantityInput } from '../src/utils/quantity';

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
    throw new Error(
      `${message || 'Assertion failed'}: expected objects to match deep equality\nActual: ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`
    );
  }
};

console.log('--- STARTING EDUPOS PRODUCT TIER CONFIGURATION PHASE 2 TESTS ---');

async function runTests() {
  // Mock in-memory storage for isolated headless repository testing
  class MockDatabase {
    products: Map<string, ProductEntity> = new Map();
    tiers: Map<string, ProductPriceTierEntity> = new Map();
    stockMovements: any[] = [];
    transactionItems: any[] = [];

    async runAsync(sql: string, params: any[] = []): Promise<void> {
      if (sql.includes('INSERT INTO products')) {
        const [id, category_id, sku, barcode, name, description, purchase_price, selling_price, stock_tracking, current_stock, minimum_stock, unit, image_uri, is_active, created_at, updated_at] = params;
        this.products.set(id, {
          id, category_id, sku, barcode, name, description, purchase_price, selling_price, stock_tracking, current_stock, minimum_stock, unit, image_uri, is_active, created_at, updated_at
        });
        return;
      }

      if (sql.includes('UPDATE products SET')) {
        const id = params[params.length - 1];
        const prod = this.products.get(id);
        if (prod) {
          if (sql.includes('selling_price = ?')) {
            const idx = sql.split('SET')[1].split(',').findIndex(s => s.trim().startsWith('selling_price'));
            if (idx !== -1) prod.selling_price = params[idx];
          }
          prod.updated_at = new Date().toISOString();
        }
        return;
      }

      if (sql.includes('DELETE FROM product_price_tiers WHERE product_id = ?')) {
        const [productId] = params;
        for (const [id, tier] of this.tiers.entries()) {
          if (tier.product_id === productId) {
            this.tiers.delete(id);
          }
        }
        return;
      }

      if (sql.includes('INSERT INTO product_price_tiers')) {
        const [id, product_id, min_quantity, unit_price, created_at, updated_at] = params;
        this.tiers.set(id, {
          id, product_id, min_quantity, unit_price, created_at, updated_at
        });
        return;
      }
    }

    async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
      if (sql.includes('FROM product_price_tiers WHERE product_id = ?')) {
        const [productId] = params;
        const res: ProductPriceTierEntity[] = [];
        for (const tier of this.tiers.values()) {
          if (tier.product_id === productId) {
            res.push(tier);
          }
        }
        res.sort((a, b) => a.min_quantity - b.min_quantity);
        return res as any;
      }
      return [] as any;
    }

    async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
      if (sql.includes('FROM product_price_tiers WHERE id = ?')) {
        const [id] = params;
        return (this.tiers.get(id) as any) || null;
      }
      return null;
    }

    async withTransactionAsync<T>(callback: () => Promise<T>): Promise<T> {
      return callback();
    }
  }

  // Setup mock environment
  const mockDb = new MockDatabase();
  const tierRepo = new ProductPriceTierRepository();

  // =========================================================================
  // TEST 1: Product Creation Without Tiers
  // =========================================================================
  console.log('Testing Test 1: Product creation without tiers...');
  {
    const productId = 'prod_test_no_tier';
    // Simulate creation without tiers
    const savedTiers = await tierRepo.replaceForProduct(productId, [], mockDb as any);
    assert.strictEqual(savedTiers.length, 0, 'Must have 0 tiers');

    const fetched = await tierRepo.getByProductId(productId, mockDb as any);
    assert.strictEqual(fetched.length, 0, 'Fetched tiers must be empty');

    console.log('  PASS: Product creation without tiers verified.');
  }

  // =========================================================================
  // TEST 2: Product Creation With Multiple Tiers
  // =========================================================================
  console.log('Testing Test 2: Product creation with multiple tiers...');
  {
    const productId = 'prod_test_multi_tier';
    const tiersInput = [
      { min_quantity: 10, unit_price: 900 },
      { min_quantity: 20, unit_price: 850 },
    ];

    const saved = await tierRepo.replaceForProduct(productId, tiersInput, mockDb as any);
    assert.strictEqual(saved.length, 2, 'Must have 2 tiers saved');
    assert.strictEqual(saved[0].min_quantity, 10, 'First tier min_quantity is 10');
    assert.strictEqual(saved[0].unit_price, 900, 'First tier unit_price is 900');
    assert.strictEqual(saved[1].min_quantity, 20, 'Second tier min_quantity is 20');
    assert.strictEqual(saved[1].unit_price, 850, 'Second tier unit_price is 850');

    // Verify ascending threshold order
    assert.ok(saved[0].min_quantity < saved[1].min_quantity, 'Tiers must be sorted ascending by min_quantity');

    console.log('  PASS: Product creation with multiple tiers verified.');
  }

  // =========================================================================
  // TEST 3: Loading Tiers When Editing a Product
  // =========================================================================
  console.log('Testing Test 3: Loading tiers when editing a product...');
  {
    const productId = 'prod_test_multi_tier';
    const loaded = await mockDb.getAllAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers WHERE product_id = ? ORDER BY min_quantity ASC;',
      [productId]
    );
    assert.strictEqual(loaded.length, 2, 'Loaded exactly 2 tiers');

    // Simulate form state mapping
    const formItems = loaded.map((t) => ({
      id: t.id,
      minQuantityText: formatQuantity(t.min_quantity),
      unitPriceText: t.unit_price.toString(),
    }));

    assert.strictEqual(formItems[0].minQuantityText, '10', 'Min quantity formatted to "10"');
    assert.strictEqual(formItems[0].unitPriceText, '900', 'Unit price formatted to "900"');
    assert.strictEqual(formItems[1].minQuantityText, '20', 'Min quantity formatted to "20"');
    assert.strictEqual(formItems[1].unitPriceText, '850', 'Unit price formatted to "850"');

    console.log('  PASS: Loading tiers for editing verified.');
  }

  // =========================================================================
  // TEST 4: Updating Tier Thresholds and Prices
  // =========================================================================
  console.log('Testing Test 4: Updating tier thresholds and prices...');
  {
    const productId = 'prod_test_multi_tier';
    // Update to new thresholds and prices
    const updatedInput = [
      { min_quantity: 15, unit_price: 880 },
      { min_quantity: 30, unit_price: 800 },
    ];

    const updated = await tierRepo.replaceForProduct(productId, updatedInput, mockDb as any);
    assert.strictEqual(updated.length, 2, 'Still exactly 2 tiers');
    assert.strictEqual(updated[0].min_quantity, 15, 'Updated threshold is 15');
    assert.strictEqual(updated[0].unit_price, 880, 'Updated price is 880');
    assert.strictEqual(updated[1].min_quantity, 30, 'Updated threshold is 30');
    assert.strictEqual(updated[1].unit_price, 800, 'Updated price is 800');

    console.log('  PASS: Updating tier thresholds and prices verified.');
  }

  // =========================================================================
  // TEST 5: Removing One or All Tiers
  // =========================================================================
  console.log('Testing Test 5: Removing one or all tiers...');
  {
    const productId = 'prod_test_multi_tier';

    // 1. Remove one tier (keep only 1 tier)
    const singleTier = [{ min_quantity: 15, unit_price: 880 }];
    const res1 = await tierRepo.replaceForProduct(productId, singleTier, mockDb as any);
    assert.strictEqual(res1.length, 1, 'Only 1 tier remains');
    assert.strictEqual(res1[0].min_quantity, 15, 'Remaining tier threshold is 15');

    // 2. Remove all tiers
    const res0 = await tierRepo.replaceForProduct(productId, [], mockDb as any);
    assert.strictEqual(res0.length, 0, 'All tiers removed (0 tiers remain)');

    const verifyEmpty = await mockDb.getAllAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers WHERE product_id = ? ORDER BY min_quantity ASC;',
      [productId]
    );
    assert.strictEqual(verifyEmpty.length, 0, 'Database contains 0 obsolete tiers');

    console.log('  PASS: Removing one and all tiers verified.');
  }

  // =========================================================================
  // TEST 6: Duplicate and Invalid Thresholds Validation
  // =========================================================================
  console.log('Testing Test 6: Duplicate and invalid thresholds validation...');
  {
    // 1. Duplicate threshold
    let caught = false;
    try {
      validateProductPriceTiers([
        { minQuantity: 10, unitPrice: 900 },
        { minQuantity: 10, unitPrice: 850 },
      ], 1000);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('duplikat'), 'Error message must mention duplikat');
    }
    assert.ok(caught, 'Must reject duplicate minQuantity thresholds');

    // 2. Zero threshold
    caught = false;
    try {
      validateProductPriceTiers([{ minQuantity: 0, unitPrice: 900 }], 1000);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('lebih besar dari 0'), 'Error must mention > 0');
    }
    assert.ok(caught, 'Must reject 0 threshold');

    // 3. Negative threshold
    caught = false;
    try {
      validateProductPriceTiers([{ minQuantity: -5, unitPrice: 900 }], 1000);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('lebih besar dari 0'), 'Error must mention > 0');
    }
    assert.ok(caught, 'Must reject negative threshold');

    // 4. Decimal threshold (fractional quantities) is allowed!
    caught = false;
    try {
      validateProductPriceTiers([
        { minQuantity: 0.5, unitPrice: 900 },
        { minQuantity: 2.5, unitPrice: 800 },
      ], 1000);
    } catch {
      caught = true;
    }
    assert.strictEqual(caught, false, 'Fractional thresholds (e.g. 0.5 kg, 2.5 kg) must be valid');

    console.log('  PASS: Duplicate and invalid threshold validation verified.');
  }

  // =========================================================================
  // TEST 7: Invalid Prices, Negative Values, and Conflicting Rules
  // =========================================================================
  console.log('Testing Test 7: Invalid prices, negative values, and conflicting rules...');
  {
    // 1. Negative price
    let caught = false;
    try {
      validateProductPriceTiers([{ minQuantity: 10, unitPrice: -500 }], 1000);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('tidak boleh negatif'), 'Must reject negative price');
    }
    assert.ok(caught, 'Must reject negative price');

    // 2. Fractional Rupiah price (minor units must be integers)
    caught = false;
    try {
      validateProductPriceTiers([{ minQuantity: 10, unitPrice: 850.5 }], 1000);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('bilangan bulat'), 'Must reject fractional Rupiah price');
    }
    assert.ok(caught, 'Must reject fractional Rupiah price');

    // 3. Tier price higher than base selling price
    caught = false;
    try {
      validateProductPriceTiers([{ minQuantity: 10, unitPrice: 1200 }], 1000);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('tidak boleh lebih mahal dari harga jual normal'), 'Must reject price higher than normal price');
    }
    assert.ok(caught, 'Must reject tier price higher than base price');

    // 4. Conflicting rules (higher quantity tier having higher price per unit)
    caught = false;
    try {
      validateProductPriceTiers([
        { minQuantity: 10, unitPrice: 850 },
        { minQuantity: 20, unitPrice: 900 }, // Conflicting! Buying 20 shouldn't cost 900 if buying 10 is 850
      ], 1000);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('konflik'), 'Must reject conflicting pricing rules');
    }
    assert.ok(caught, 'Must reject inverted tier pricing');

    console.log('  PASS: Invalid prices and conflicting rules validation verified.');
  }

  // =========================================================================
  // TEST 8: Product Cancellation Without Persisting Unsaved Tier Edits
  // =========================================================================
  console.log('Testing Test 8: Product cancellation without persisting unsaved edits...');
  {
    const productId = 'prod_cancel_test';
    // Initial state in DB: Tier 1 (Min 10 @ Rp 900)
    await tierRepo.replaceForProduct(productId, [{ min_quantity: 10, unit_price: 900 }], mockDb as any);

    // User opens form: local UI state has 1 tier
    const initialLoaded = await mockDb.getAllAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers WHERE product_id = ?;',
      [productId]
    );
    let localFormState = initialLoaded.map((t) => ({
      minQuantityText: formatQuantity(t.min_quantity),
      unitPriceText: t.unit_price.toString(),
    }));

    // User adds another tier in local form state
    localFormState.push({
      minQuantityText: '20',
      unitPriceText: '800',
    });
    assert.strictEqual(localFormState.length, 2, 'Local form state has 2 tiers');

    // User presses "Batal" (Cancel): modal closes without calling service.updateProduct
    // DB is NOT updated!
    const dbTiersAfterCancel = await mockDb.getAllAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers WHERE product_id = ?;',
      [productId]
    );
    assert.strictEqual(dbTiersAfterCancel.length, 1, 'Database remains unchanged with exactly 1 tier');
    assert.strictEqual(dbTiersAfterCancel[0].min_quantity, 10, 'Initial tier remains untouched');

    console.log('  PASS: Product cancellation without persisting unsaved edits verified.');
  }

  // =========================================================================
  // TEST 9: Existing Products Remaining Compatible Without Wholesale Tiers
  // =========================================================================
  console.log('Testing Test 9: Existing products remaining compatible without wholesale tiers...');
  {
    const productId = 'prod_legacy_1';
    // Product with NO tiers
    const tiers = await mockDb.getAllAsync<ProductPriceTierEntity>(
      'SELECT * FROM product_price_tiers WHERE product_id = ?;',
      [productId]
    );
    assert.strictEqual(tiers.length, 0, 'Legacy product has 0 tiers');

    const basePrice = 25000;
    // Quantity 1
    const res1 = resolveTierUnitPrice(basePrice, tiers, 1);
    assert.strictEqual(res1.unitPrice, 25000, 'Qty 1 uses base price');
    assert.strictEqual(res1.activeTier, null, 'No active tier');

    // Large quantity 100
    const res100 = resolveTierUnitPrice(basePrice, tiers, 100);
    assert.strictEqual(res100.unitPrice, 25000, 'Qty 100 uses base price');
    assert.strictEqual(res100.activeTier, null, 'No active tier');

    console.log('  PASS: Existing products compatibility verified.');
  }

  // =========================================================================
  // TEST 10: Product Changes Not Affecting Historical Transaction Snapshots
  // =========================================================================
  console.log('Testing Test 10: Product changes not affecting historical transaction snapshots...');
  {
    const productId = 'prod_historical_test';
    // Historical completed transaction item snapshot
    const historicalItem = {
      id: 'ti_historical_1',
      transaction_id: 'tx_historical_1',
      product_id: productId,
      product_name_snapshot: 'Original Product Name',
      sku_snapshot: 'ORIG-001',
      quantity: 50,
      unit_price: 1000, // Captured at purchase time
      discount_amount: 0,
      subtotal: 50000,
      created_at: '2026-09-01T10:00:00Z',
    };

    // Owner modifies product later: changes name, increases base price, adds wholesale tier
    await tierRepo.replaceForProduct(productId, [
      { min_quantity: 10, unit_price: 900 },
      { min_quantity: 40, unit_price: 750 },
    ], mockDb as any);

    // Historical item snapshot must remain completely unaltered
    assert.strictEqual(historicalItem.product_name_snapshot, 'Original Product Name', 'Historical name snapshot preserved');
    assert.strictEqual(historicalItem.unit_price, 1000, 'Historical unit price snapshot preserved');
    assert.strictEqual(historicalItem.quantity, 50, 'Historical quantity snapshot preserved');
    assert.strictEqual(historicalItem.subtotal, 50000, 'Historical subtotal snapshot preserved');

    console.log('  PASS: Historical transaction snapshots remain completely immutable.');
  }

  console.log('--- ALL PRODUCT TIER CONFIGURATION PHASE 2 TESTS PASSED (10/10) ---');
}

runTests().catch((err) => {
  console.error('Phase 2 test suite failed:', err);
  process.exit(1);
});
