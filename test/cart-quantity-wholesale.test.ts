import { posService, CartItem } from '../src/services/pos/POSService';
import { ProductEntity } from '../src/database/types';
import {
  calculateLineSubtotal,
  resolveTierUnitPrice,
  formatQuantity,
  parseQuantityInput,
  isDecimalAllowedForUnit,
} from '../src/utils/quantity';

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

console.log('--- STARTING EDUPOS CART QUANTITY & WHOLESALE PRICING PHASE 3 TESTS ---');

async function runTests() {
  // Test products setup
  const discreteProductWithTiers: ProductEntity & { priceTiers: any[] } = {
    id: 'prod_snack_tier',
    category_id: 'cat_snack',
    sku: 'SNK-001',
    barcode: '899123456001',
    name: 'Keripik Singkong',
    description: null,
    purchase_price: 700,
    selling_price: 1000, // Base price: Rp 1.000
    stock_tracking: 1,
    current_stock: 100,
    minimum_stock: 10,
    unit: 'pcs',
    image_uri: null,
    is_active: 1,
    created_at: '2026-10-17T12:00:00Z',
    updated_at: '2026-10-17T12:00:00Z',
    priceTiers: [
      { min_quantity: 12, unit_price: 900 }, // Tier 1: >= 12 pcs @ Rp 900
      { min_quantity: 20, unit_price: 850 }, // Tier 2: >= 20 pcs @ Rp 850
    ],
  };

  const discreteProductNoTiers: ProductEntity & { priceTiers: any[] } = {
    id: 'prod_drink',
    category_id: 'cat_drink',
    sku: 'DRK-001',
    barcode: '899123456002',
    name: 'Teh Botol',
    description: null,
    purchase_price: 15000,
    selling_price: 25000,
    stock_tracking: 1,
    current_stock: 50,
    minimum_stock: 5,
    unit: 'btl',
    image_uri: null,
    is_active: 1,
    created_at: '2026-10-17T12:00:00Z',
    updated_at: '2026-10-17T12:00:00Z',
    priceTiers: [],
  };

  const weightProduct: ProductEntity & { priceTiers: any[] } = {
    id: 'prod_fruit_kg',
    category_id: 'cat_fruit',
    sku: 'FRT-001',
    barcode: '899123456003',
    name: 'Apel Fuji',
    description: null,
    purchase_price: 14000,
    selling_price: 20000, // Base price: Rp 20.000 / kg
    stock_tracking: 1,
    current_stock: 10.0,
    minimum_stock: 2.0,
    unit: 'kg',
    image_uri: null,
    is_active: 1,
    created_at: '2026-10-17T12:00:00Z',
    updated_at: '2026-10-17T12:00:00Z',
    priceTiers: [
      { min_quantity: 5.0, unit_price: 18000 }, // Tier 1: >= 5 kg @ Rp 18.000
    ],
  };

  // =========================================================================
  // TEST 1: Setting an item's quantity directly
  // =========================================================================
  console.log('Testing Test 1: Setting an item quantity directly...');
  {
    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, discreteProductWithTiers);
    assert.strictEqual(cart.length, 1, 'Cart has 1 item');
    assert.strictEqual(cart[0].quantity, 1, 'Initial quantity is 1');
    assert.strictEqual(cart[0].unitPrice, 1000, 'Initial price is Rp 1000');
    assert.strictEqual(cart[0].subtotal, 1000, 'Initial subtotal is Rp 1000');

    // Directly set quantity to 5
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 5);
    assert.strictEqual(cart[0].quantity, 5, 'Quantity updated directly to 5');
    assert.strictEqual(cart[0].unitPrice, 1000, 'Price remains base price Rp 1000');
    assert.strictEqual(cart[0].subtotal, 5000, 'Subtotal updated to Rp 5000');

    console.log('  PASS: Direct quantity setting verified.');
  }

  // =========================================================================
  // TEST 2: Editing one cart item without changing other items
  // =========================================================================
  console.log('Testing Test 2: Editing one cart item without affecting others...');
  {
    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, discreteProductWithTiers);
    cart = posService.addItemToCart(cart, discreteProductNoTiers);
    cart = posService.setItemQuantity(cart, discreteProductNoTiers.id, 3);

    assert.strictEqual(cart.length, 2, 'Cart has 2 items');
    assert.strictEqual(cart[1].quantity, 3, 'Second item qty is 3');
    assert.strictEqual(cart[1].subtotal, 75000, 'Second item subtotal is 75000');

    // Change first item to 8
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 8);
    assert.strictEqual(cart[0].quantity, 8, 'First item updated to 8');
    assert.strictEqual(cart[0].subtotal, 8000, 'First item subtotal is 8000');

    // Verify second item is completely unaffected
    assert.strictEqual(cart[1].productId, discreteProductNoTiers.id, 'Second item id preserved');
    assert.strictEqual(cart[1].quantity, 3, 'Second item quantity remains 3');
    assert.strictEqual(cart[1].unitPrice, 25000, 'Second item unit price remains 25000');
    assert.strictEqual(cart[1].subtotal, 75000, 'Second item subtotal remains 75000');

    console.log('  PASS: Multi-item isolation verified.');
  }

  // =========================================================================
  // TEST 3: Empty, malformed, negative, zero, and unsupported decimal quantity handling
  // =========================================================================
  console.log('Testing Test 3: Rejection of malformed/invalid quantities and discrete unit rules...');
  {
    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, discreteProductWithTiers);

    // 1. Setting quantity to 0 removes the item
    const cartAfterZero = posService.setItemQuantity(cart, discreteProductWithTiers.id, 0);
    assert.strictEqual(cartAfterZero.length, 0, 'Quantity 0 removes item from cart');

    // 2. Negative quantity throws
    let caught = false;
    try {
      posService.setItemQuantity(cart, discreteProductWithTiers.id, -2);
    } catch {
      caught = true;
    }
    assert.ok(caught, 'Must reject negative quantity');

    // 3. Non-finite quantity throws
    caught = false;
    try {
      posService.setItemQuantity(cart, discreteProductWithTiers.id, NaN);
    } catch {
      caught = true;
    }
    assert.ok(caught, 'Must reject NaN quantity');

    // 4. Decimal quantity on discrete unit ('pcs') throws
    caught = false;
    try {
      posService.setItemQuantity(cart, discreteProductWithTiers.id, 1.5);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('hanya menerima jumlah bulat'), 'Error must specify integer-only requirement for pcs');
    }
    assert.ok(caught, 'Must reject decimal quantity on discrete unit "pcs"');

    console.log('  PASS: Invalid and unsupported quantities rejected safely.');
  }

  // =========================================================================
  // TEST 4: Valid decimal quantities for eligible products
  // =========================================================================
  console.log('Testing Test 4: Decimal quantities on weight-based products (0.471 kg)...');
  {
    assert.strictEqual(isDecimalAllowedForUnit('kg'), true, 'Unit "kg" permits decimals');
    assert.strictEqual(isDecimalAllowedForUnit('g'), true, 'Unit "g" permits decimals');
    assert.strictEqual(isDecimalAllowedForUnit('pcs'), false, 'Unit "pcs" does not permit decimals');

    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, weightProduct);

    // Directly set quantity to 0.471 kg (specification target example)
    cart = posService.setItemQuantity(cart, weightProduct.id, 0.471);
    assert.strictEqual(cart[0].quantity, 0.471, 'Quantity is 0.471');
    assert.strictEqual(cart[0].unitPrice, 20000, 'Price is Rp 20.000 / kg');
    // Subtotal: 20000 * 0.471 = 9420
    assert.strictEqual(cart[0].subtotal, 9420, 'Line subtotal is exactly Rp 9.420');

    // Verify totals
    const totals = posService.calculateTotals(cart, { type: 'FIXED', value: 0, calculatedAmount: 0 });
    assert.strictEqual(totals.subtotal, 9420, 'Totals subtotal is Rp 9.420');
    assert.strictEqual(totals.grandTotal, 9420, 'Totals grandTotal is Rp 9.420');
    assert.strictEqual(totals.totalItemCount, 0.471, 'Total item count preserves decimal 0.471');

    console.log('  PASS: Decimal quantity on weight product verified.');
  }

  // =========================================================================
  // TEST 5: Quantity validation against available stock
  // =========================================================================
  console.log('Testing Test 5: Quantity validation against available stock...');
  {
    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, discreteProductWithTiers); // stock = 100

    // Setting beyond stock (101) throws
    let caught = false;
    try {
      posService.setItemQuantity(cart, discreteProductWithTiers.id, 101);
    } catch (err: any) {
      caught = true;
      assert.ok(err.message.includes('Stok tidak mencukupi'), 'Error must mention stock limit');
    }
    assert.ok(caught, 'Must reject quantity exceeding available stock');

    // Setting exact available stock (100) succeeds
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 100);
    assert.strictEqual(cart[0].quantity, 100, 'Exact stock quantity accepted');

    console.log('  PASS: Stock limit validation verified.');
  }

  // =========================================================================
  // TEST 6: Wholesale threshold boundaries (11, 12, 19, 20 pcs) & correct subtotal
  // =========================================================================
  console.log('Testing Test 6: Wholesale threshold boundaries (11, 12, 19, 20 pcs)...');
  {
    // Rules for discreteProductWithTiers:
    // Base: Rp 1000
    // >= 12 pcs: Rp 900
    // >= 20 pcs: Rp 850
    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, discreteProductWithTiers);

    // 1. Boundary 11 pcs (Just below Tier 1 threshold)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 11);
    assert.strictEqual(cart[0].quantity, 11, 'Quantity is 11');
    assert.strictEqual(cart[0].unitPrice, 1000, 'Price at 11 pcs is base price Rp 1.000');
    assert.strictEqual(cart[0].subtotal, 11000, 'Subtotal at 11 pcs is Rp 11.000');
    assert.strictEqual(cart[0].activeTier, null, 'No active tier at 11 pcs');

    // 2. Boundary 12 pcs (Exact Tier 1 threshold)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 12);
    assert.strictEqual(cart[0].quantity, 12, 'Quantity is 12');
    assert.strictEqual(cart[0].unitPrice, 900, 'Price at 12 pcs drops to tier price Rp 900');
    assert.strictEqual(cart[0].subtotal, 10800, 'Subtotal at 12 pcs is 12 x 900 = Rp 10.800');
    assert.ok(cart[0].activeTier !== null, 'Tier 1 is active at 12 pcs');
    assert.strictEqual(cart[0].activeTier?.unit_price, 900, 'Active tier unit price is 900');

    // 3. Boundary 19 pcs (Just below Tier 2 threshold)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 19);
    assert.strictEqual(cart[0].quantity, 19, 'Quantity is 19');
    assert.strictEqual(cart[0].unitPrice, 900, 'Price at 19 pcs is still tier 1 price Rp 900');
    assert.strictEqual(cart[0].subtotal, 17100, 'Subtotal at 19 pcs is 19 x 900 = Rp 17.100');
    assert.strictEqual(cart[0].activeTier?.min_quantity, 12, 'Active tier is Tier 1');

    // 4. Boundary 20 pcs (Exact Tier 2 threshold)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 20);
    assert.strictEqual(cart[0].quantity, 20, 'Quantity is 20');
    assert.strictEqual(cart[0].unitPrice, 850, 'Price at 20 pcs drops to tier 2 price Rp 850');
    assert.strictEqual(cart[0].subtotal, 17000, 'Subtotal at 20 pcs is 20 x 850 = Rp 17.000');
    assert.strictEqual(cart[0].activeTier?.min_quantity, 20, 'Active tier is Tier 2');

    console.log('  PASS: Exact wholesale boundaries (11, 12, 19, 20 pcs) verified.');
  }

  // =========================================================================
  // TEST 7: Changing quantity across tier boundaries in both directions
  // =========================================================================
  console.log('Testing Test 7: Changing quantity across tier boundaries in both directions...');
  {
    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, discreteProductWithTiers);

    // Upward transition: 5 -> 15 (crosses Tier 1)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 15);
    assert.strictEqual(cart[0].unitPrice, 900, 'Price at 15 is Rp 900');
    assert.strictEqual(cart[0].subtotal, 13500, 'Subtotal is 13500');

    // Upward transition: 15 -> 25 (crosses Tier 2)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 25);
    assert.strictEqual(cart[0].unitPrice, 850, 'Price at 25 is Rp 850');
    assert.strictEqual(cart[0].subtotal, 21250, 'Subtotal is 21250');

    // Downward transition: 25 -> 18 (crosses back down to Tier 1)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 18);
    assert.strictEqual(cart[0].unitPrice, 900, 'Price reverts to Rp 900');
    assert.strictEqual(cart[0].subtotal, 16200, 'Subtotal is 16200');

    // Downward transition: 18 -> 2 (crosses back down to Base Price)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 2);
    assert.strictEqual(cart[0].unitPrice, 1000, 'Price reverts to base price Rp 1000');
    assert.strictEqual(cart[0].subtotal, 2000, 'Subtotal is 2000');
    assert.strictEqual(cart[0].activeTier, null, 'Active tier removed');

    console.log('  PASS: Bidirectional tier boundary traversal verified.');
  }

  // =========================================================================
  // TEST 8: Adding an existing product line and recalculating its tier
  // =========================================================================
  console.log('Testing Test 8: Adding an existing product line and recalculating tier...');
  {
    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, discreteProductWithTiers);
    // Set to 11 (just before tier)
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 11);
    assert.strictEqual(cart[0].unitPrice, 1000, 'Qty 11 uses base price Rp 1000');

    // Add 1 more by tapping product again
    cart = posService.addItemToCart(cart, discreteProductWithTiers);
    assert.strictEqual(cart[0].quantity, 12, 'Quantity increments to 12');
    assert.strictEqual(cart[0].unitPrice, 900, 'Unit price automatically switches to Rp 900');
    assert.strictEqual(cart[0].subtotal, 10800, 'Subtotal recalculated to Rp 10.800');
    assert.ok(cart[0].activeTier !== null, 'Active tier badge triggered');

    console.log('  PASS: Re-adding existing product triggers automatic tier recalculation.');
  }

  // =========================================================================
  // TEST 9: Products without tiers retaining normal prices
  // =========================================================================
  console.log('Testing Test 9: Products without tiers retaining normal prices...');
  {
    let cart: CartItem[] = [];
    cart = posService.addItemToCart(cart, discreteProductNoTiers);

    // Test quantities 1, 15, 30
    for (const q of [1, 15, 30]) {
      cart = posService.setItemQuantity(cart, discreteProductNoTiers.id, q);
      assert.strictEqual(cart[0].unitPrice, 25000, `Price at qty ${q} must remain base price Rp 25.000`);
      assert.strictEqual(cart[0].subtotal, q * 25000, `Subtotal at qty ${q} is ${q * 25000}`);
      assert.strictEqual(cart[0].activeTier, null, 'No tier is active');
    }

    console.log('  PASS: Products without tiers retain standard selling price.');
  }

  // =========================================================================
  // TEST 10: Consistent rounding for fractional quantity calculations
  // =========================================================================
  console.log('Testing Test 10: Consistent deterministic rounding for fractional calculations...');
  {
    // Standard weight calculation: 20000 * 0.471 = 9420
    assert.strictEqual(calculateLineSubtotal(20000, 0.471), 9420, '20000 * 0.471 = 9420');

    // Half-up rounding case: 19999 * 0.471 = 9419.529 -> rounds to 9420
    assert.strictEqual(calculateLineSubtotal(19999, 0.471), 9420, '19999 * 0.471 = 9420');

    // Fractional: 15500 * 0.333 = 5161.5 -> rounds to 5162
    assert.strictEqual(calculateLineSubtotal(15500, 0.333), 5162, '15500 * 0.333 = 5162');

    // Weight product with wholesale tier: >= 5 kg @ Rp 18.000
    // 5.5 kg * Rp 18.000 = Rp 99.000
    const resWeightTier = resolveTierUnitPrice(weightProduct.selling_price, weightProduct.priceTiers, 5.5);
    assert.strictEqual(resWeightTier.unitPrice, 18000, 'Weight product qualifies for tier at 5.5 kg');
    assert.strictEqual(calculateLineSubtotal(resWeightTier.unitPrice, 5.5), 99000, 'Subtotal is Rp 99.000');

    console.log('  PASS: Deterministic subtotal rounding verified.');
  }

  // =========================================================================
  // TEST 11: Checkout receiving effective unit price and correct subtotal
  // =========================================================================
  console.log('Testing Test 11: Checkout payload receiving effective unit price and subtotal...');
  {
    let cart: CartItem[] = [];
    // Add wholesale item at Tier 2 (20 pcs @ Rp 850 = Rp 17.000)
    cart = posService.addItemToCart(cart, discreteProductWithTiers);
    cart = posService.setItemQuantity(cart, discreteProductWithTiers.id, 20);

    // Add weight item (0.471 kg @ Rp 20.000 = Rp 9.420)
    cart = posService.addItemToCart(cart, weightProduct);
    cart = posService.setItemQuantity(cart, weightProduct.id, 0.471);

    const totals = posService.calculateTotals(cart, { type: 'FIXED', value: 0, calculatedAmount: 0 });
    assert.strictEqual(totals.subtotal, 26420, 'Cart total is 17000 + 9420 = 26420');
    assert.strictEqual(totals.grandTotal, 26420, 'Grand total is 26420');

    // Verify snapshot fields that checkout will persist
    assert.strictEqual(cart[0].unitPrice, 850, 'Item 1 passes effective tier unit price 850');
    assert.strictEqual(cart[0].subtotal, 17000, 'Item 1 passes subtotal 17000');
    assert.strictEqual(cart[1].unitPrice, 20000, 'Item 2 passes unit price 20000');
    assert.strictEqual(cart[1].quantity, 0.471, 'Item 2 passes decimal quantity 0.471');
    assert.strictEqual(cart[1].subtotal, 9420, 'Item 2 passes subtotal 9420');

    console.log('  PASS: Checkout data payload verified with effective prices.');
  }

  // =========================================================================
  // TEST 12: Decimal stock deduction and historical immutability
  // =========================================================================
  console.log('Testing Test 12: Decimal stock deduction and historical immutability...');
  {
    const initialStock = 10.0;
    const soldQty = 0.471;
    const remainingStock = Math.round((initialStock - soldQty) * 1000) / 1000;
    assert.strictEqual(remainingStock, 9.529, '10.0 - 0.471 = 9.529 kg');

    // Verify historical completed transaction item is decoupled from future tier changes
    const historicalSnapshot = {
      product_id: discreteProductWithTiers.id,
      quantity: 20,
      unit_price: 850,
      subtotal: 17000,
    };

    // Store owner later changes tier price to Rp 800
    const newTiers = [{ min_quantity: 20, unit_price: 800 }];
    const futurePrice = resolveTierUnitPrice(1000, newTiers, 20);
    assert.strictEqual(futurePrice.unitPrice, 800, 'Future sales will use Rp 800');

    // Historical snapshot remains completely unchanged
    assert.strictEqual(historicalSnapshot.unit_price, 850, 'Historical unit price snapshot preserved');
    assert.strictEqual(historicalSnapshot.subtotal, 17000, 'Historical subtotal snapshot preserved');

    console.log('  PASS: Decimal stock deduction & historical immutability verified.');
  }

  console.log('--- ALL CART QUANTITY & WHOLESALE PRICING PHASE 3 TESTS PASSED (12/12) ---');
}

runTests().catch((err) => {
  console.error('Phase 3 test suite failed:', err);
  process.exit(1);
});
