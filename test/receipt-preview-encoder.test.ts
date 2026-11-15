import { EscPosEncoder } from '../src/services/printer/EscPosEncoder';
import {
  compileReceiptDocument,
  compileLegacyReceiptDocument,
  resolveReceiptPaperWidth,
} from '../src/services/receipt/ReceiptDocumentCompiler';
import {
  createDefaultTemplate,
} from '../src/services/receipt/templateOperations';
import {
  ReceiptDocument,
  TextLineNode,
  KeyValueRowNode,
  CurrencyRowNode,
  ItemRowNode,
  DividerNode,
  LogoNode,
  SpacerNode,
} from '../src/types/receiptDocument';
import {
  ReceiptData,
  createSampleReceiptData,
} from '../src/services/receipt/ReceiptService';
import { RasterBitmap } from '../src/services/printer/ImageRaster';
import {
  formatHeaderRow,
  formatRightAlignedCurrencyRow,
  formatItemRow,
  formatAlignedRow,
  formatNumber,
} from '../src/services/receipt/receiptLayoutHelper';

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
    throw new Error(`${message || 'Assertion failed'}: expected objects to match deep equality`);
  }
};

console.log('--- STARTING EDUPOS RECEIPT PREVIEW & ENCODER PHASE 3B TESTS ---');

const mockRaster: RasterBitmap = {
  width: 16,
  height: 8,
  data: new Array(16).fill(0),
};

const mockReceiptData: ReceiptData = {
  config: {
    storeName: 'EduPOS Toko Buku',
    storeAddress: 'Jl. Ahmad Yani No. 10',
    storePhone: '0812345678',
    showLogo: true,
    showHeader: true,
    showStoreAddress: true,
    showStorePhone: true,
    showTransactionNumber: true,
    showDateTime: true,
    showCashier: true,
    showCustomer: true,
    showPaymentMethod: true,
    showChange: true,
    showSubtotal: true,
    showDiscount: true,
    showTax: false,
    showTotal: true,
    showFooter: true,
    footerText: 'Terima Kasih Telah Berbelanja',
    receiptWidth: '80mm',
  },
  store: {
    name: 'EduPOS Toko Buku',
    address: 'Jl. Ahmad Yani No. 10',
    phone: '0812345678',
  },
  transaction: {
    transactionNumber: 'TRX-20261017-001',
    date: '17/10/2026',
    time: '14:30',
    cashierName: 'Ahmad Kasir',
    customerName: 'Budi Santoso',
    subtotal: 100000,
    discount: 10000,
    total: 90000,
  },
  items: [
    {
      name: 'Buku Tulis Hard Cover Tebal Bergaris 100 Lembar Edisi Khusus Siswa',
      sku: 'BK-100',
      quantity: 2,
      unitPrice: 50000,
      subtotal: 100000,
    },
  ],
  payments: [
    {
      method: 'cash',
      amount: 90000,
      receivedAmount: 100000,
      changeAmount: 10000,
      referenceNumber: '',
    },
  ],
  logoRaster: mockRaster,
};

// Helper to strip ESC/POS commands and non-printable control bytes
function stripEscPos(str: string): string {
  return str
    .replace(/\x1b[@a-zA-Z0-9\x00-\x1f]*/g, '')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '');
}

// Helper to decode ASCII bytes from buffer
function bytesToString(bytes: number[]): string {
  return String.fromCharCode.apply(null, bytes);
}

// ==========================================
// Test 1: EscPosEncoder.encodeDocument handles all 7 node types
// ==========================================
console.log('Testing Test 1: EscPosEncoder.encodeDocument handles all 7 node types cleanly...');
{
  const doc: ReceiptDocument = {
    metadata: {
      templateId: 'test-template',
      templateName: 'Test Template',
      paperWidth: '80mm',
      columns: 48,
      compiledAt: new Date().toISOString(),
      transactionNumber: 'TRX-001',
    },
    nodes: [
      { type: 'logo', align: 'center', uri: 'file://logo.png', hasRaster: true },
      { type: 'text_line', text: 'EduPOS Mart', align: 'center', bold: true, size: 'large' },
      { type: 'text_line', text: '', align: 'left' }, // empty newline
      { type: 'key_value_row', key: 'Kasir', value: 'Budi' },
      { type: 'divider', style: 'dashed', char: '-', columns: 48, spacing: 'none' },
      {
        type: 'item_row',
        name: 'Kopi Susu Gula Aren Spesial',
        quantity: 2,
        unitPrice: 15000,
        subtotal: 30000,
      },
      { type: 'currency_row', label: 'Subtotal', currency: 'Rp.', amount: 30000 },
      {
        type: 'currency_row',
        label: 'Diskon',
        currency: 'Rp.',
        amount: 5000,
        isNegative: true,
      },
      {
        type: 'currency_row',
        label: 'TOTAL',
        currency: 'Rp.',
        amount: 25000,
        bold: true,
        size: 'large',
      },
      { type: 'spacer', lines: 2 },
    ],
  };

  const encoder = new EscPosEncoder(48);
  const bytes = encoder.encodeDocument(doc, mockRaster, false);

  assert.ok(bytes.length > 0, 'Buffer should not be empty');
  // Check initialization ESC @
  assert.strictEqual(bytes[0], 0x1B, 'First byte should be ESC');
  assert.strictEqual(bytes[1], 0x40, 'Second byte should be @');

  const str = bytesToString(bytes);
  assert.ok(str.includes('EduPOS Mart'), 'Buffer should include store header text');
  assert.ok(str.includes('Kasir'), 'Buffer should include key-value key');
  assert.ok(str.includes('Budi'), 'Buffer should include key-value value');
  assert.ok(str.includes('Kopi Susu Gula Aren Spesial'), 'Buffer should include product name');
  assert.ok(str.includes('Rp. '), 'Buffer should include dedicated Rp. currency column');
  assert.ok(str.includes('TOTAL'), 'Buffer should include grand total label');

  console.log('  PASS: All 7 node types encoded cleanly into ESC/POS buffer.');
}

// ==========================================
// Test 2: Target paper width adaptation (80mm vs 58mm)
// ==========================================
console.log('Testing Test 2: Target paper width adaptation in EscPosEncoder.encodeDocument...');
{
  const doc80: ReceiptDocument = {
    metadata: {
      paperWidth: '80mm',
      columns: 48,
      compiledAt: new Date().toISOString(),
    },
    nodes: [{ type: 'divider', style: 'single', char: '-', columns: 48, spacing: 'none' }],
  };

  const enc80 = new EscPosEncoder();
  enc80.encodeDocument(doc80);
  assert.strictEqual(enc80.getColumns(), 48, 'Encoder should adapt to 48 columns for 80mm');

  const doc58: ReceiptDocument = {
    metadata: {
      paperWidth: '58mm',
      columns: 32,
      compiledAt: new Date().toISOString(),
    },
    nodes: [{ type: 'divider', style: 'single', char: '-', columns: 32, spacing: 'none' }],
  };

  const enc58 = new EscPosEncoder();
  enc58.encodeDocument(doc58);
  assert.strictEqual(enc58.getColumns(), 32, 'Encoder should adapt to 32 columns for 58mm');

  console.log('  PASS: Target paper width correctly adjusts encoder column layout.');
}

// ==========================================
// Test 3: Currency column alignment contract
// ==========================================
console.log('Testing Test 3: Currency row alignment contract on 80mm and 58mm...');
{
  // 80mm: Currency ends at index 47 (totalWidth - 1), legacy formatCurrencyRow at index 32
  const doc80: ReceiptDocument = {
    metadata: { paperWidth: '80mm', columns: 48, compiledAt: new Date().toISOString() },
    nodes: [
      { type: 'currency_row', label: 'Total Belanja', currency: 'Rp.', amount: 150000 },
      { type: 'currency_row', label: 'Diskon Member', currency: 'Rp.', amount: 15000, isNegative: true },
    ],
  };

  const enc80 = new EscPosEncoder(48);
  const bytes80 = enc80.encodeDocument(doc80);

  // Legacy formatCurrencyRow guarantee for backwards compatibility
  const row80Total = enc80.formatCurrencyRow('Total Belanja', 150000, 48);
  assert.strictEqual(row80Total.length, 48, 'On 80mm, row must be 48 characters');
  assert.strictEqual(row80Total.indexOf('Rp. '), 32, 'On 80mm, Rp. must start at character index 32');

  const row80Discount = enc80.formatCurrencyRow('Diskon Member', 15000, 48, { isNegative: true });
  assert.strictEqual(row80Discount.length, 48, 'On 80mm, discount row must be 48 characters');
  assert.strictEqual(row80Discount.indexOf('Rp. '), 32, 'On 80mm, discount Rp. must start at index 32');

  // Verify that encodeDocument includes both rows in the byte stream
  const str80 = bytesToString(bytes80);
  assert.ok(str80.includes('Total Belanja'), 'Buffer contains label');
  assert.ok(str80.includes('Rp.      150.000'), 'Buffer contains fixed-column currency');
  assert.ok(str80.includes('Diskon Member'), 'Buffer contains discount label');
  assert.ok(str80.includes('Rp.      -15.000'), 'Buffer contains fixed-column negative currency');

  // 58mm: Currency ends at index 31
  const doc58: ReceiptDocument = {
    metadata: { paperWidth: '58mm', columns: 32, compiledAt: new Date().toISOString() },
    nodes: [
      { type: 'currency_row', label: 'Total', currency: 'Rp.', amount: 50000 },
    ],
  };

  const enc58 = new EscPosEncoder(32);
  const bytes58 = enc58.encodeDocument(doc58);
  const row58 = enc58.formatCurrencyRow('Total', 50000, 32);
  assert.strictEqual(row58.length, 32, 'On 58mm, row must be 32 characters');
  assert.strictEqual(row58.indexOf('Rp. '), 18, 'On 58mm, Rp. must start at index 18');

  const str58 = bytesToString(bytes58);
  assert.ok(str58.includes('Total'), '58mm buffer contains label');
  assert.ok(str58.includes('Rp.     50.000'), '58mm buffer contains fixed-column currency');

  console.log('  PASS: Currency column alignment preserved at index 32 (80mm) and index 18 (58mm).');
}

// ==========================================
// Test 4: Item row wrapping and line formatting
// ==========================================
console.log('Testing Test 4: Long product name wrapping in item_row...');
{
  const doc: ReceiptDocument = {
    metadata: { paperWidth: '80mm', columns: 48, compiledAt: new Date().toISOString() },
    nodes: [
      {
        type: 'item_row',
        name: 'Buku Tulis Sinar Dunia 38 Lembar Kertas Tebal Halus Berkualitas Tinggi',
        quantity: 5,
        unitPrice: 4500,
        subtotal: 22500,
      },
    ],
  };

  const enc = new EscPosEncoder(48);
  const bytes = enc.encodeDocument(doc);
  const str = bytesToString(bytes);

  assert.ok(str.includes('Buku Tulis Sinar Dunia'), 'Wrapped name contains first chunk');
  assert.ok(str.includes('4.500'), 'Includes unit price without Rp prefix');
  assert.ok(str.includes('22.500'), 'Includes subtotal without Rp prefix');
  assert.ok(!str.includes('Rp. 4.500'), 'Item unit price must NOT include Rp prefix');
  assert.ok(!str.includes('Rp. 22.500'), 'Item subtotal must NOT include Rp prefix');

  console.log('  PASS: Long product name wraps cleanly without truncation and without Rp on items.');
}

// ==========================================
// Test 5: DividerNode and SpacerNode
// ==========================================
console.log('Testing Test 5: Divider styles and SpacerNode in encodeDocument...');
{
  const doc: ReceiptDocument = {
    metadata: { paperWidth: '80mm', columns: 48, compiledAt: new Date().toISOString() },
    nodes: [
      { type: 'divider', style: 'double', char: '=', columns: 48, spacing: 'large' },
      { type: 'spacer', lines: 3 },
    ],
  };

  const enc = new EscPosEncoder(48);
  const bytes = enc.encodeDocument(doc);
  const str = bytesToString(bytes);

  assert.ok(str.includes('='.repeat(48)), 'Double divider should repeat = 48 times');

  console.log('  PASS: Dividers and spacers output expected characters and lines.');
}

// ==========================================
// Test 6: LogoNode raster behavior
// ==========================================
console.log('Testing Test 6: LogoNode with and without raster data...');
{
  const docWithLogo: ReceiptDocument = {
    metadata: { paperWidth: '80mm', columns: 48, compiledAt: new Date().toISOString() },
    nodes: [
      { type: 'logo', align: 'center', uri: 'file://logo.png', hasRaster: true },
    ],
  };

  const encWithLogo = new EscPosEncoder(48);
  const bytesWithLogo = encWithLogo.encodeDocument(docWithLogo, mockRaster);
  // Check for GS v 0 raster header: 0x1D, 0x76, 0x30, 0x00
  const hasGsV0 = bytesWithLogo.some(
    (b, idx) =>
      b === 0x1D &&
      bytesWithLogo[idx + 1] === 0x76 &&
      bytesWithLogo[idx + 2] === 0x30 &&
      bytesWithLogo[idx + 3] === 0x00
  );
  assert.strictEqual(hasGsV0, true, 'Buffer must contain GS v 0 command when raster is supplied');

  const encWithoutLogo = new EscPosEncoder(48);
  const bytesWithoutLogo = encWithoutLogo.encodeDocument(docWithLogo, undefined);
  const hasGsV0Without = bytesWithoutLogo.some(
    (b, idx) =>
      b === 0x1D &&
      bytesWithoutLogo[idx + 1] === 0x76 &&
      bytesWithoutLogo[idx + 2] === 0x30 &&
      bytesWithoutLogo[idx + 3] === 0x00
  );
  assert.strictEqual(hasGsV0Without, false, 'Buffer must NOT contain GS v 0 when raster is missing');

  console.log('  PASS: LogoNode raster encoding verified.');
}

// ==========================================
// Test 7: AutoCut command in encodeDocument
// ==========================================
console.log('Testing Test 7: AutoCut command handling...');
{
  const doc: ReceiptDocument = {
    metadata: { paperWidth: '80mm', columns: 48, compiledAt: new Date().toISOString() },
    nodes: [{ type: 'text_line', text: 'End of Receipt', align: 'center' }],
  };

  const encCut = new EscPosEncoder(48);
  const bytesCut = encCut.encodeDocument(doc, undefined, true);
  // GS V A 16 = 0x1D, 0x56, 0x41, 0x10
  const last4 = bytesCut.slice(-4);
  assert.deepStrictEqual(
    last4,
    [0x1D, 0x56, 0x41, 0x10],
    'Buffer must end with GS V A 16 when autoCut is true'
  );

  const encNoCut = new EscPosEncoder(48);
  const bytesNoCut = encNoCut.encodeDocument(doc, undefined, false);
  const last4NoCut = bytesNoCut.slice(-4);
  assert.notStrictEqual(
    JSON.stringify(last4NoCut),
    JSON.stringify([0x1D, 0x56, 0x41, 0x10]),
    'Buffer must not end with GS V A 16 when autoCut is false'
  );

  console.log('  PASS: AutoCut command correctly appended or omitted.');
}

// ==========================================
// Test 8: End-to-end integration: compileReceiptDocument -> encodeDocument
// ==========================================
console.log('Testing Test 8: End-to-end compilation with custom template to ESC/POS...');
{
  const template = createDefaultTemplate('80mm');
  template.name = 'Custom Template';
  // Add custom header banner at position 0
  const bannerBlock: import('../src/types/receiptTemplate').ReceiptBlock = {
    id: 'promo_1',
    type: 'custom_text',
    visible: true,
    text: '*** PROMO SPESIAL AKHIR PEKAN ***',
    align: 'center',
    bold: true,
    fontSize: 'normal',
  };
  template.blocks.unshift(bannerBlock);

  const doc = compileReceiptDocument(template, mockReceiptData, { targetWidth: '80mm' });
  const encoder = new EscPosEncoder(48);
  const bytes = encoder.encodeDocument(doc, mockRaster, false);

  assert.ok(bytes.length > 500, 'Compiled document bytes should be substantial');
  const str = bytesToString(bytes);
  assert.ok(str.includes('PROMO SPESIAL AKHIR PEKAN'), 'Output must contain custom block text');
  assert.ok(str.includes('TRX-20261017-001'), 'Output must contain transaction number');
  assert.ok(str.includes('Ahmad Kasir'), 'Output must contain cashier name');
  assert.ok(str.includes('TOTAL'), 'Output must contain total');

  console.log('  PASS: End-to-end custom template compilation and encoding succeeded.');
}

// ==========================================
// Test 9: End-to-end integration: compileLegacyReceiptDocument -> encodeDocument
// ==========================================
console.log('Testing Test 9: End-to-end compilation with legacy config fallback...');
{
  const doc = compileLegacyReceiptDocument(mockReceiptData, { targetWidth: '80mm' });
  const encoder = new EscPosEncoder(48);
  const bytes = encoder.encodeDocument(doc, mockRaster, false);

  assert.ok(bytes.length > 500, 'Legacy document should produce complete printable bytes');
  const str = bytesToString(bytes);
  assert.ok(str.includes('EduPOS Toko Buku'), 'Legacy document includes store name');
  assert.ok(str.includes('Terima Kasih Telah Berbelanja'), 'Legacy document includes footer');

  console.log('  PASS: Legacy document compilation and encoding fully backward compatible.');
}

// ==========================================
// Test 10: createSampleReceiptData helper validation
// ==========================================
console.log('Testing Test 10: createSampleReceiptData helper...');
{
  const sample = createSampleReceiptData();
  assert.ok(sample.config, 'Sample must have config');
  assert.ok(sample.store.name, 'Sample must have store name');
  assert.ok(sample.transaction.transactionNumber, 'Sample must have transactionNumber');
  assert.ok(sample.items.length > 0, 'Sample must have sample items');
  assert.ok(sample.payments.length > 0, 'Sample must have sample payments');
  assert.strictEqual(typeof sample.transaction.total, 'number', 'Total must be numeric');

  console.log('  PASS: createSampleReceiptData helper is valid and complete.');
}

// ==========================================
// Test 11: Phase 3B.1 Regression: Template width 58mm vs printer 80mm
// ==========================================
console.log('Testing Test 11: Template width 58mm precedence over printer default 80mm...');
{
  const resolved = resolveReceiptPaperWidth({
    templateWidth: '58mm',
    printerWidth: '80mm',
    configWidth: '80mm',
  });
  assert.strictEqual(resolved, '58mm', 'Template width 58mm must take precedence over printer default 80mm');

  const template58 = createDefaultTemplate('58mm');
  assert.strictEqual(template58.paperWidth, '58mm', 'Template has 58mm paperWidth');

  const doc = compileReceiptDocument(template58, mockReceiptData);
  assert.strictEqual(doc.metadata.paperWidth, '58mm', 'Compiled document metadata must be 58mm');
  assert.strictEqual(doc.metadata.columns, 32, 'Compiled document metadata must specify 32 columns');

  const encoder = new EscPosEncoder();
  encoder.encodeDocument(doc);
  assert.strictEqual(encoder.getColumns(), 32, 'Encoder must format with 32 columns for 58mm template');

  console.log('  PASS: 58mm template correctly compiles and encodes to 32 columns despite 80mm printer default.');
}

// ==========================================
// Test 12: Phase 3B.1 Regression: Template width 80mm
// ==========================================
console.log('Testing Test 12: Template width 80mm produces 48 columns...');
{
  const resolved = resolveReceiptPaperWidth({
    templateWidth: '80mm',
    printerWidth: '58mm',
    configWidth: '58mm',
  });
  assert.strictEqual(resolved, '80mm', 'Template width 80mm must take precedence over printer 58mm');

  const template80 = createDefaultTemplate('80mm');
  const doc = compileReceiptDocument(template80, mockReceiptData);
  assert.strictEqual(doc.metadata.paperWidth, '80mm', 'Compiled document metadata must be 80mm');
  assert.strictEqual(doc.metadata.columns, 48, 'Compiled document metadata must specify 48 columns');

  const encoder = new EscPosEncoder();
  encoder.encodeDocument(doc);
  assert.strictEqual(encoder.getColumns(), 48, 'Encoder must format with 48 columns for 80mm template');

  console.log('  PASS: 80mm template correctly compiles and encodes to 48 columns.');
}

// ==========================================
// Test 13: Phase 3B.1 Regression: Explicit override takes precedence over template
// ==========================================
console.log('Testing Test 13: Explicit modal override takes precedence over template setting...');
{
  // User selects 58mm in modal for an 80mm template
  const resolved58 = resolveReceiptPaperWidth({
    explicitWidth: '58mm',
    templateWidth: '80mm',
    printerWidth: '80mm',
  });
  assert.strictEqual(resolved58, '58mm', 'Explicit 58mm override must win over 80mm template');

  // User selects 80mm in modal for a 58mm template
  const resolved80 = resolveReceiptPaperWidth({
    explicitWidth: '80mm',
    templateWidth: '58mm',
    printerWidth: '58mm',
  });
  assert.strictEqual(resolved80, '80mm', 'Explicit 80mm override must win over 58mm template');

  console.log('  PASS: Explicit width override reliably takes highest precedence.');
}

// ==========================================
// Test 14: Phase 3B.1 Regression: Legacy fallback behavior without template
// ==========================================
console.log('Testing Test 14: Legacy fallback behavior without template is preserved...');
{
  // Legacy case 1: config 80mm, printer 80mm
  const res1 = resolveReceiptPaperWidth({ configWidth: '80mm', printerWidth: '80mm' });
  assert.strictEqual(res1, '80mm', 'Legacy 80/80 resolves to 80mm');

  // Legacy case 2: config 58mm, printer 58mm
  const res2 = resolveReceiptPaperWidth({ configWidth: '58mm', printerWidth: '58mm' });
  assert.strictEqual(res2, '58mm', 'Legacy 58/58 resolves to 58mm');

  // Legacy case 3: config 58mm, but printer is 80mm (legacy behavior prioritized physical 80mm printer)
  const res3 = resolveReceiptPaperWidth({ configWidth: '58mm', printerWidth: '80mm' });
  assert.strictEqual(res3, '80mm', 'Legacy printer 80mm fallback preserved when no template exists');

  // Legacy case 4: config 80mm, printer 58mm
  const res4 = resolveReceiptPaperWidth({ configWidth: '80mm', printerWidth: '58mm' });
  assert.strictEqual(res4, '80mm', 'Legacy config 80mm preserved');

  console.log('  PASS: All legacy fallback width permutations preserved exactly.');
}

// ==========================================
// Test 15: Phase 3B.1 Regression: Preview and printing consistency
// ==========================================
console.log('Testing Test 15: Preview and printing use consistent width-resolution rules...');
{
  const template = createDefaultTemplate('58mm');
  const previewWidth = resolveReceiptPaperWidth({
    templateWidth: template.paperWidth,
    configWidth: mockReceiptData.config.receiptWidth,
  });
  const printWidth = resolveReceiptPaperWidth({
    templateWidth: template.paperWidth,
    configWidth: mockReceiptData.config.receiptWidth,
    printerWidth: '80mm',
  });

  assert.strictEqual(previewWidth, '58mm', 'Preview must resolve to 58mm');
  assert.strictEqual(printWidth, '58mm', 'Printing must resolve to 58mm');
  assert.strictEqual(previewWidth, printWidth, 'Preview and print width resolution must match 100%');

  console.log('  PASS: Preview and printing width resolution is 100% consistent.');
}

// ==========================================
// Test 16: Approved Receipt Layout Verification
// ==========================================
console.log('Testing Test 16: Approved receipt layout verification (Header order, Item columns, Summary alignment)...');
{
  // A. Header order: No. Trx, Tgl, Kasir, Plg with consistent colon index 8 and value index 10
  const headerNoTrx = formatHeaderRow('No. Trx', 'TRX-20261017-001', 48);
  const headerTgl = formatHeaderRow('Tgl', '17/10/2026', 48);
  const headerKasir = formatHeaderRow('Kasir', 'Store Owner', 48);
  const headerPlg = formatHeaderRow('Plg', 'Nama Pelanggan', 48);

  assert.strictEqual(headerNoTrx[0].length, 26);
  assert.strictEqual(headerNoTrx[0].indexOf('No. Trx'), 0, 'No. Trx label at col 0');
  assert.strictEqual(headerNoTrx[0].indexOf(':'), 8, 'No. Trx colon at col 8');
  assert.strictEqual(headerNoTrx[0].indexOf('TRX-20261017-001'), 10, 'Value starts at col 10');

  assert.strictEqual(headerTgl[0].indexOf('Tgl'), 0, 'Tgl label at col 0');
  assert.strictEqual(headerTgl[0].indexOf(':'), 8, 'Tgl colon at col 8');
  assert.strictEqual(headerTgl[0].indexOf('17/10/2026'), 10, 'Tgl value left-aligned at col 10');

  assert.strictEqual(headerKasir[0].indexOf('Kasir'), 0, 'Kasir label at col 0');
  assert.strictEqual(headerKasir[0].indexOf(':'), 8, 'Kasir colon at col 8');
  assert.strictEqual(headerKasir[0].indexOf('Store Owner'), 10, 'Kasir value starts at col 10');

  assert.strictEqual(headerPlg[0].indexOf('Plg'), 0, 'Plg label at col 0');
  assert.strictEqual(headerPlg[0].indexOf(':'), 8, 'Plg colon at col 8');
  assert.strictEqual(headerPlg[0].indexOf('Nama Pelanggan'), 10, 'Plg value starts at col 10');

  // Long value wrapping indents continuation line to column 10
  const longPlg = formatHeaderRow('Plg', 'Bapak Muhammad Sulaiman Al-Habsyi Panjang Sekali', 32);
  assert.ok(longPlg.length >= 2, 'Long customer name wraps on 58mm');
  assert.ok(longPlg[1].startsWith(' '.repeat(10)), 'Continuation line indented to column 10');

  // B. Item List Layout (80mm & 58mm)
  // 80mm: Banana Cake
  // 25  x   35.000                    875.000
  const item80 = formatItemRow('Banana Cake', 25, 35000, 875000, 48);
  assert.strictEqual(item80[0], 'Banana Cake', 'Line 1 is product name');
  assert.strictEqual(item80[1].length, 48, 'Line 2 must be 48 chars on 80mm');
  assert.ok(item80[1].endsWith('875.000'), 'Subtotal ends at final column');
  assert.ok(!item80[1].includes('Rp.'), 'Must not print Rp. on item rows');
  assert.strictEqual(item80[1].indexOf('x'), 6, 'x is in fixed column');

  // 80mm: Bottled Tea
  const itemTea80 = formatItemRow('Bottled Tea', 11, 6000, 66000, 48);
  assert.strictEqual(itemTea80[1].length, 48);
  assert.ok(itemTea80[1].endsWith('66.000'), 'Tea subtotal ends at final column');
  assert.strictEqual(itemTea80[1].indexOf('x'), 6, 'x matches fixed column index 6');
  assert.ok(!itemTea80[1].includes('Rp.'));

  // 58mm: Banana Cake
  const item58 = formatItemRow('Banana Cake', 25, 35000, 875000, 32);
  assert.strictEqual(item58[0], 'Banana Cake');
  assert.strictEqual(item58[1].length, 32, 'Line 2 must be 32 chars on 58mm');
  assert.ok(item58[1].endsWith('875.000'), '58mm subtotal ends at final column');
  assert.ok(!item58[1].includes('Rp.'));

  // C. Summary and Payment Alignment: Consistent Rp. column (32 on 80mm, 18 on 58mm)
  const summaryRows80 = [
    { label: 'Subtotal', amount: 1163000 },
    { label: 'Diskon', amount: 0 },
    { label: 'TOTAL', amount: 1163000 },
    { label: 'Tunai Diterima', amount: 1200000 },
    { label: 'Kembalian', amount: 37000 },
  ];

  summaryRows80.forEach(({ label, amount }) => {
    const formatted = formatRightAlignedCurrencyRow(label, amount, 48);
    assert.strictEqual(formatted.length, 48, `Summary row "${label}" must be 48 chars`);
    assert.strictEqual(formatted.indexOf('Rp. '), 32, `"${label}" Rp. must be at fixed column 32 on 80mm`);
    assert.ok(formatted.endsWith(formatNumber(amount)), `"${label}" must end with amount`);
  });

  // 58mm summary alignment: fixed Rp. at column 18
  const summaryRows58 = [
    { label: 'Subtotal', amount: 1163000 },
    { label: 'TOTAL', amount: 1163000 },
    { label: 'Tunai Diterima', amount: 1200000 },
    { label: 'Kembalian', amount: 37000 },
  ];

  summaryRows58.forEach(({ label, amount }) => {
    const formatted = formatRightAlignedCurrencyRow(label, amount, 32);
    assert.strictEqual(formatted.length, 32, `58mm row "${label}" must be 32 chars`);
    assert.strictEqual(formatted.indexOf('Rp. '), 18, `"${label}" Rp. must be at fixed column 18 on 58mm`);
    assert.ok(formatted.endsWith(formatNumber(amount)));
  });

  // D. End-to-end compiler verification for header sequence
  const compiled = compileReceiptDocument(createDefaultTemplate('80mm'), mockReceiptData);
  const textLines = compiled.nodes.filter((n) => n.type === 'text_line') as TextLineNode[];
  const metaLines = textLines.map((n) => n.text);

  const idxTrx = metaLines.findIndex((t) => t.startsWith('No. Trx'));
  const idxTgl = metaLines.findIndex((t) => t.startsWith('Tgl'));
  const idxKasir = metaLines.findIndex((t) => t.startsWith('Kasir'));
  const idxPlg = metaLines.findIndex((t) => t.startsWith('Plg'));

  assert.ok(idxTrx !== -1, 'No. Trx must be present');
  assert.ok(idxTgl !== -1, 'Tgl must be present');
  assert.ok(idxKasir !== -1, 'Kasir must be present');
  assert.ok(idxPlg !== -1, 'Plg must be present');

  assert.ok(idxTrx < idxTgl, 'No. Trx must precede Tgl');
  assert.ok(idxTgl < idxKasir, 'Tgl must precede Kasir');
  assert.ok(idxKasir < idxPlg, 'Kasir must precede Plg');

  console.log('  PASS: Approved receipt layout verification passed on 80mm & 58mm.');
}

console.log('--- ALL UNIT TESTS COMPLETED SUCCESSFULLY (16/16 PASSED) ---');

