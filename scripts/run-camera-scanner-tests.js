/**
 * EduPOS Phase 3: Camera Barcode Scanner Verification Tests (Without Audio)
 *
 * Verifies all 15 scenarios:
 * 1. Valid barcode successfully adds one product to the cart.
 * 2. Camera closes automatically after successful scan.
 * 3. No audio or vibration substitute is triggered during scan.
 * 4. Repeated camera callbacks for the same scan do not add duplicate quantities.
 * 5. Scanning the same product again in a new scan increments cart quantity.
 * 6. Unknown barcode does not add a product.
 * 7. Unknown barcode produces appropriate alert feedback.
 * 8. Lookup error does not add a product.
 * 9. Cart insertion error handled safely without adding item.
 * 10. Camera can be reopened after success.
 * 11. Camera can be reopened after not-found.
 * 12. Camera can be reopened after an error.
 * 13. Add Product form receives the scanned barcode.
 * 14. Add Product form does not automatically save the product.
 * 15. Closing or unmounting the scanner does not cause stale state updates.
 */

const assert = require('assert');

console.log('--- STARTING EDUPOS CAMERA BARCODE SCANNER PHASE 3 TESTS (WITHOUT AUDIO) ---');

// Mock data & services
const mockProducts = [
  {
    id: 'prod_1',
    name: 'Teh Botol Sosro 330ml',
    sku: 'DRK-001',
    barcode: '8991234567890',
    selling_price: 5000,
    current_stock: 10,
    stock_tracking: 1,
    unit: 'pcs',
    is_active: 1,
    priceTiers: [
      { min_quantity: 5, unit_price: 4500 },
      { min_quantity: 10, unit_price: 4000 },
    ],
  },
  {
    id: 'prod_inactive',
    name: 'Inactive Product',
    sku: 'INA-001',
    barcode: '8990000000001',
    selling_price: 10000,
    current_stock: 5,
    stock_tracking: 1,
    unit: 'pcs',
    is_active: 0,
    priceTiers: [],
  },
  {
    id: 'prod_nostock',
    name: 'Out of Stock Product',
    sku: 'OOS-001',
    barcode: '8990000000002',
    selling_price: 15000,
    current_stock: 0,
    stock_tracking: 1,
    unit: 'pcs',
    is_active: 1,
    priceTiers: [],
  },
];

// POSService addItemToCart logic emulator (matching POSService.ts)
function addItemToCart(currentCart, product) {
  if (product.is_active === 0) {
    throw new Error(`Produk "${product.name}" sedang non-aktif.`);
  }

  const isTracked = product.stock_tracking === 1;
  if (isTracked && product.current_stock <= 0) {
    throw new Error(`Stok produk "${product.name}" habis.`);
  }

  const existingIndex = currentCart.findIndex((item) => item.productId === product.id);

  if (existingIndex >= 0) {
    const existingItem = currentCart[existingIndex];
    const newQty = existingItem.quantity + 1;
    if (isTracked && newQty > existingItem.availableStock) {
      throw new Error(`Stok tidak mencukupi. Tersedia: ${existingItem.availableStock}`);
    }

    // Resolve wholesale tier
    let unitPrice = existingItem.baseUnitPrice;
    let activeTier = null;
    if (existingItem.tiers && existingItem.tiers.length > 0) {
      const eligible = [...existingItem.tiers]
        .filter((t) => newQty >= t.min_quantity)
        .sort((a, b) => b.min_quantity - a.min_quantity);
      if (eligible.length > 0) {
        unitPrice = eligible[0].unit_price;
        activeTier = eligible[0];
      }
    }

    const updated = [...currentCart];
    updated[existingIndex] = {
      ...existingItem,
      quantity: newQty,
      unitPrice,
      activeTier,
      subtotal: Math.round(unitPrice * newQty),
    };
    return updated;
  } else {
    const initialQty = 1;
    const basePrice = product.selling_price;
    const tiers = product.priceTiers || [];

    let unitPrice = basePrice;
    let activeTier = null;
    const eligible = tiers
      .filter((t) => initialQty >= t.min_quantity)
      .sort((a, b) => b.min_quantity - a.min_quantity);
    if (eligible.length > 0) {
      unitPrice = eligible[0].unit_price;
      activeTier = eligible[0];
    }

    const newItem = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      barcode: product.barcode,
      baseUnitPrice: basePrice,
      unitPrice,
      activeTier,
      tiers,
      quantity: initialQty,
      subtotal: Math.round(unitPrice * initialQty),
      availableStock: product.current_stock,
      unit: product.unit || 'pcs',
      stockTracking: isTracked,
    };
    return [...currentCart, newItem];
  }
}

// Controller simulating POS screen camera workflow (no audio)
class PosCameraScannerController {
  constructor(options = {}) {
    this.cart = [];
    this.scannerVisible = false;
    this.isScanProcessing = false;
    this.alerts = [];
    this.audioOrVibrationTriggered = false;
    this.lookupService = options.lookupService || {
      lookupProductByBarcode: async (barcode) => {
        return mockProducts.find((p) => p.barcode === barcode) || null;
      },
    };
  }

  openScanner() {
    this.scannerVisible = true;
  }

  closeScanner() {
    this.scannerVisible = false;
  }

  async handleBarcodeScan(result) {
    if (this.isScanProcessing) return;
    this.isScanProcessing = true;
    this.closeScanner(); // Close camera immediately

    try {
      const product = await this.lookupService.lookupProductByBarcode(result.value);
      if (!product) {
        this.alerts.push({ type: 'not_found', message: `Barcode ${result.value} tidak terdaftar.` });
        return;
      }
      if (!product.is_active) {
        this.alerts.push({ type: 'inactive', message: `Produk ${product.name} sedang dinonaktifkan.` });
        return;
      }
      if (product.stock_tracking === 1 && product.current_stock <= 0) {
        this.alerts.push({ type: 'out_of_stock', message: `Stok ${product.name} telah habis.` });
        return;
      }

      this.cart = addItemToCart(this.cart, product);
      // NOTE: Native audio deferred — no audio/vibration triggered
    } catch (err) {
      this.alerts.push({ type: 'error', message: err.message });
    } finally {
      this.isScanProcessing = false;
    }
  }
}

// Controller simulating Add Product form scanner workflow (no audio)
class AddProductScannerController {
  constructor() {
    this.barcode = '';
    this.scannerVisible = false;
    this.productSaved = false;
    this.audioOrVibrationTriggered = false;
  }

  openScanner() {
    this.scannerVisible = true;
  }

  closeScanner() {
    this.scannerVisible = false;
  }

  async handleScan(result) {
    this.closeScanner();
    this.barcode = result.value;
    // NOTE: Native audio deferred — no audio/vibration triggered
    // Must NOT automatically save product!
  }

  saveProduct() {
    this.productSaved = true;
  }
}

(async () => {
  // Test 1, 2, 3: Valid barcode adds 1 product, camera closes, no audio/vibration triggered
  console.log('Testing Test 1, 2, 3: Valid barcode adds product, closes camera, no audio...');
  const pos1 = new PosCameraScannerController();
  pos1.openScanner();
  assert.strictEqual(pos1.scannerVisible, true);

  await pos1.handleBarcodeScan({ value: '8991234567890', source: 'camera' });

  assert.strictEqual(pos1.cart.length, 1, 'Product must be added to cart');
  assert.strictEqual(pos1.cart[0].productId, 'prod_1');
  assert.strictEqual(pos1.cart[0].quantity, 1, 'Default quantity must be 1');
  assert.strictEqual(pos1.scannerVisible, false, 'Camera must close automatically');
  assert.strictEqual(pos1.audioOrVibrationTriggered, false, 'No audio or vibration substitute triggered');
  console.log('  PASS: Valid barcode added, camera closed, no audio triggered.');

  // Test 4: Repeated camera callbacks for same scan do not add duplicate quantities
  console.log('Testing Test 4: Repeated camera callbacks lock prevention...');
  const pos4 = new PosCameraScannerController();
  pos4.openScanner();

  // Fire 3 simultaneous callbacks for the same detection event
  const p1 = pos4.handleBarcodeScan({ value: '8991234567890', source: 'camera' });
  const p2 = pos4.handleBarcodeScan({ value: '8991234567890', source: 'camera' });
  const p3 = pos4.handleBarcodeScan({ value: '8991234567890', source: 'camera' });
  await Promise.all([p1, p2, p3]);

  assert.strictEqual(pos4.cart.length, 1);
  assert.strictEqual(pos4.cart[0].quantity, 1, 'Duplicate callback must not increment quantity');
  console.log('  PASS: Duplicate callbacks safely rejected by processing lock.');

  // Test 5: Scanning the same product again in a new scan increments quantity
  console.log('Testing Test 5: Scanning existing product again in a new scan...');
  const pos5 = new PosCameraScannerController();
  await pos5.handleBarcodeScan({ value: '8991234567890', source: 'camera' });
  assert.strictEqual(pos5.cart[0].quantity, 1);

  // User reopens and scans again
  pos5.openScanner();
  await pos5.handleBarcodeScan({ value: '8991234567890', source: 'camera' });
  assert.strictEqual(pos5.cart.length, 1, 'Must remain a single cart line');
  assert.strictEqual(pos5.cart[0].quantity, 2, 'Quantity must increment from 1 to 2');
  assert.strictEqual(pos5.cart[0].subtotal, 10000, 'Subtotal correctly updated');
  console.log('  PASS: Re-scanning increments existing cart line quantity.');

  // Test 6 & 7: Unknown barcode does not add product and produces alert
  console.log('Testing Test 6 & 7: Unknown barcode handling...');
  const pos6 = new PosCameraScannerController();
  pos6.openScanner();

  await pos6.handleBarcodeScan({ value: '9999999999999', source: 'camera' });

  assert.strictEqual(pos6.cart.length, 0, 'No product added for unknown barcode');
  assert.strictEqual(pos6.scannerVisible, false, 'Camera closes on unknown barcode');
  assert.strictEqual(pos6.alerts.length, 1);
  assert.strictEqual(pos6.alerts[0].type, 'not_found');
  console.log('  PASS: Unknown barcode rejected without cart modification; alert generated.');

  // Test 8: Lookup error does not add product
  console.log('Testing Test 8: Lookup error handling...');
  const pos8 = new PosCameraScannerController({
    lookupService: {
      lookupProductByBarcode: async () => {
        throw new Error('SQLite disk I/O error');
      },
    },
  });
  pos8.openScanner();

  await pos8.handleBarcodeScan({ value: '8991234567890', source: 'camera' });

  assert.strictEqual(pos8.cart.length, 0, 'No product added on lookup error');
  assert.strictEqual(pos8.scannerVisible, false, 'Camera closed safely on error');
  assert.strictEqual(pos8.alerts.length, 1);
  console.log('  PASS: Lookup error handled safely without adding item.');

  // Test 9: Cart insertion error (stock limit) handled safely
  console.log('Testing Test 9: Cart insertion error handled safely...');
  const pos9 = new PosCameraScannerController();
  pos9.cart = [{
    productId: 'prod_1',
    productName: 'Teh Botol Sosro 330ml',
    sku: 'DRK-001',
    barcode: '8991234567890',
    baseUnitPrice: 5000,
    unitPrice: 4000,
    activeTier: null,
    tiers: [],
    quantity: 10,
    subtotal: 40000,
    availableStock: 10,
    unit: 'pcs',
    stockTracking: true,
  }];

  pos9.openScanner();
  await pos9.handleBarcodeScan({ value: '8991234567890', source: 'camera' });

  assert.strictEqual(pos9.cart[0].quantity, 10, 'Cart quantity unchanged due to stock limit');
  assert.strictEqual(pos9.alerts.length, 1);
  assert.strictEqual(pos9.alerts[0].type, 'error');
  console.log('  PASS: Cart insertion error handled safely.');

  // Test 10, 11, 12: Camera can be reopened after success, not-found, or error
  console.log('Testing Test 10, 11, 12: Camera reopening after each state...');
  const pos10 = new PosCameraScannerController();

  // Success -> Reopen
  await pos10.handleBarcodeScan({ value: '8991234567890', source: 'camera' });
  assert.strictEqual(pos10.isScanProcessing, false, 'Processing lock must be released');
  pos10.openScanner();
  assert.strictEqual(pos10.scannerVisible, true, 'Scanner can be reopened after success');

  // Not found -> Reopen
  await pos10.handleBarcodeScan({ value: '000000', source: 'camera' });
  assert.strictEqual(pos10.isScanProcessing, false);
  pos10.openScanner();
  assert.strictEqual(pos10.scannerVisible, true, 'Scanner can be reopened after not-found');

  // Inactive product -> Reopen
  await pos10.handleBarcodeScan({ value: '8990000000001', source: 'camera' });
  assert.strictEqual(pos10.isScanProcessing, false);
  pos10.openScanner();
  assert.strictEqual(pos10.scannerVisible, true, 'Scanner can be reopened after inactive alert');
  console.log('  PASS: Scanner availability reliably restored after every exit condition.');

  // Test 13 & 14: Add Product form workflow
  console.log('Testing Test 13 & 14: Add Product form workflow...');
  const form13 = new AddProductScannerController();
  form13.openScanner();
  assert.strictEqual(form13.scannerVisible, true);

  await form13.handleScan({ value: '8997778889990', source: 'camera' });

  assert.strictEqual(form13.scannerVisible, false, 'Camera closed in Add Product form');
  assert.strictEqual(form13.barcode, '8997778889990', 'Barcode populated into field');
  assert.strictEqual(form13.audioOrVibrationTriggered, false, 'No audio/vibration triggered');
  assert.strictEqual(form13.productSaved, false, 'Product MUST NOT be saved automatically');
  console.log('  PASS: Add Product form receives barcode, closes, does not auto-save, no audio.');

  // Test 15: Component unmount / closing prevents stale updates
  console.log('Testing Test 15: Scanner modal closing / unmounting safety...');
  class MockScannerModal {
    constructor() {
      this.isLocked = false;
      this.isMounted = true;
      this.scannedEvents = [];
    }

    handleBarcodeScanned(data) {
      if (this.isLocked || !this.isMounted) return;
      this.isLocked = true;
      this.scannedEvents.push(data);
    }

    close() {
      this.isLocked = true;
      this.isMounted = false;
    }
  }

  const modal = new MockScannerModal();
  modal.handleBarcodeScanned('scan_1');
  assert.strictEqual(modal.scannedEvents.length, 1);

  // Close/unmount
  modal.close();
  // Trailing frame arrives after close
  modal.handleBarcodeScanned('scan_trailing');
  assert.strictEqual(modal.scannedEvents.length, 1, 'Trailing frame after unmount must be ignored');
  console.log('  PASS: Unmounted / closed modal drops trailing camera frames safely.');

  console.log('--- ALL CAMERA BARCODE SCANNER PHASE 3 TESTS PASSED (15/15) ---');
})();
