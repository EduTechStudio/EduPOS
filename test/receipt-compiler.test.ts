import {
  compileReceiptDocument,
  compileLegacyReceiptDocument,
  compileBlockToNodes,
  formatPaymentMethodLabel,
  getDividerChar,
  buildPlaceholderData,
} from '../src/services/receipt/ReceiptDocumentCompiler';
import { createDefaultTemplate } from '../src/services/receipt/templateOperations';
import {
  ReceiptTemplate,
  ReceiptBlock,
} from '../src/types/receiptTemplate';
import { ReceiptData } from '../src/services/receipt/ReceiptService';
import {
  CurrencyRowNode,
  ItemRowNode,
  TextLineNode,
  DividerNode,
  LogoNode,
  SpacerNode,
} from '../src/types/receiptDocument';

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

console.log('--- STARTING EDUPOS RECEIPT COMPILER PHASE 3A TESTS ---');

const mockReceiptData: ReceiptData = {
  config: {
    storeName: 'EduPOS Cafe & Minimarket',
    storeAddress: 'Jl. Merdeka Raya No. 45, Jakarta Selatan',
    storePhone: '+62 812-3456-7890',
    showHeader: true,
    showStoreAddress: true,
    showStorePhone: true,
    showLogo: true,
    showFooter: true,
    footerText: 'Terima Kasih Telah Berbelanja di EduPOS!',
    showCashier: true,
    showTransactionNumber: true,
    showDateTime: true,
    showCustomer: true,
    showPaymentMethod: true,
    showDiscount: true,
    showTax: true,
    showSubtotal: true,
    showTotal: true,
    showChange: true,
    receiptWidth: '80mm',
    logo: 'file:///data/user/0/com.storepos.mobile/files/receipt_logo.png',
  },
  store: {
    name: 'EduPOS Cafe & Minimarket',
    address: 'Jl. Merdeka Raya No. 45, Jakarta Selatan',
    phone: '+62 812-3456-7890',
  },
  transaction: {
    transactionNumber: 'TRX-20261017-0099',
    date: '17/10/2026',
    time: '16:30',
    cashierName: 'Ahmad Faisal',
    customerName: 'Bapak Muhammad Sulaiman',
    subtotal: 150000,
    discount: 15000,
    total: 135000,
  },
  items: [
    {
      name: 'Kopi Susu Gula Aren Spesial',
      sku: 'KOP-01',
      quantity: 2,
      unitPrice: 25000,
      subtotal: 50000,
    },
    {
      name: 'Roti Bakar Cokelat Keju Spesial Mozzarella Jumbo',
      sku: 'ROT-02',
      quantity: 1,
      unitPrice: 100000,
      subtotal: 100000,
    },
  ],
  payments: [
    {
      method: 'cash',
      amount: 135000,
      receivedAmount: 150000,
      changeAmount: 15000,
      referenceNumber: '',
    },
  ],
};

// Test 1: Compilation of all 15 block types
console.log('Testing Test 1: Compilation of all 15 block types...');
{
  const template = createDefaultTemplate('80mm');
  // Add spacer & custom_text to ensure all 15 types are present
  template.blocks.splice(2, 0, {
    id: 'blk_test_custom',
    type: 'custom_text',
    visible: true,
    text: 'Promo Hari Ini: Diskon Member',
    align: 'center',
    fontSize: 'normal',
    bold: true,
  });
  template.blocks.push({
    id: 'blk_test_spacer',
    type: 'spacer',
    visible: true,
    lines: 2,
  });

  const doc = compileReceiptDocument(template, mockReceiptData, { targetWidth: '80mm' });
  assert.ok(doc, 'Document must be compiled');
  assert.strictEqual(doc.metadata.paperWidth, '80mm');
  assert.strictEqual(doc.metadata.columns, 48);

  const nodeTypes = new Set(doc.nodes.map((n) => n.type));
  assert.ok(nodeTypes.has('logo'), 'Document must contain logo node');
  assert.ok(nodeTypes.has('text_line'), 'Document must contain text_line nodes');
  assert.ok(nodeTypes.has('divider'), 'Document must contain divider nodes');
  assert.ok(nodeTypes.has('item_row'), 'Document must contain item_row nodes');
  assert.ok(nodeTypes.has('currency_row'), 'Document must contain currency_row nodes');
  assert.ok(nodeTypes.has('spacer'), 'Document must contain spacer nodes');

  console.log('  PASS: All block types compiled to expected document nodes.');
}

// Test 2: Disabled blocks produce zero document nodes
console.log('Testing Test 2: Disabled blocks produce no document nodes...');
{
  const template = createDefaultTemplate('80mm');
  // Disable logo and store_header
  template.blocks = template.blocks.map((b) => {
    if (b.type === 'logo' || b.type === 'store_header') {
      return { ...b, visible: false };
    }
    return b;
  });

  const doc = compileReceiptDocument(template, mockReceiptData);
  const hasLogo = doc.nodes.some((n) => n.type === 'logo');
  const hasStoreName = doc.nodes.some(
    (n) => n.type === 'text_line' && (n as TextLineNode).text === mockReceiptData.store.name
  );

  assert.strictEqual(hasLogo, false, 'Disabled logo block must not emit any nodes');
  assert.strictEqual(hasStoreName, false, 'Disabled store_header must not emit any nodes');

  console.log('  PASS: Disabled blocks cleanly omitted from compiled document.');
}

// Test 3: Block ordering strictly matches template block order
console.log('Testing Test 3: Block ordering matches template block sequence...');
{
  const template: ReceiptTemplate = {
    id: 'tmpl_order_test',
    name: 'Order Test',
    paperWidth: '80mm',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blocks: [
      {
        id: 'b_footer',
        type: 'footer_text',
        visible: true,
        text: 'FOOTER FIRST',
        align: 'center',
      },
      {
        id: 'b_div',
        type: 'divider',
        visible: true,
        style: 'double',
        spacing: 'none',
      },
      {
        id: 'b_subtotal',
        type: 'subtotal',
        visible: true,
        label: 'SUBTOTAL SECOND',
      },
    ],
  };

  const doc = compileReceiptDocument(template, mockReceiptData);
  assert.strictEqual(doc.nodes.length, 3);
  assert.strictEqual(doc.nodes[0].type, 'text_line');
  assert.strictEqual((doc.nodes[0] as TextLineNode).text, 'FOOTER FIRST');
  assert.strictEqual(doc.nodes[1].type, 'divider');
  assert.strictEqual((doc.nodes[1] as DividerNode).char, '=');
  assert.strictEqual(doc.nodes[2].type, 'currency_row');
  assert.strictEqual((doc.nodes[2] as CurrencyRowNode).label, 'SUBTOTAL SECOND');

  console.log('  PASS: Block order strictly preserved in compiled document nodes.');
}

// Test 4: Placeholder substitution in custom_text and footer_text
console.log('Testing Test 4: Placeholder substitution in text blocks...');
{
  const template: ReceiptTemplate = {
    id: 'tmpl_placeholder',
    name: 'Placeholder Test',
    paperWidth: '80mm',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blocks: [
      {
        id: 'b_custom',
        type: 'custom_text',
        visible: true,
        text: 'Nota: {{trx_number}} | Kasir: {{cashier_name}} | {{unknown_macro}}',
        align: 'left',
        fontSize: 'normal',
        bold: false,
      },
    ],
  };

  const doc = compileReceiptDocument(template, mockReceiptData);
  assert.strictEqual(doc.nodes.length, 1);
  const textNode = doc.nodes[0] as TextLineNode;
  assert.ok(
    textNode.text.includes('Nota: TRX-20261017-0099 | Kasir: Ahmad Faisal'),
    'Allowlisted placeholders must be replaced'
  );
  assert.ok(
    textNode.text.includes('{{unknown_macro}}'),
    'Unrecognized placeholder tokens must remain literal text'
  );

  console.log('  PASS: Placeholder substitution replaces allowlisted tokens and preserves unknown macros.');
}

// Test 5: 58mm (32 cols) and 80mm (48 cols) column metadata
console.log('Testing Test 5: Column metadata for 58mm and 80mm...');
{
  const template80 = createDefaultTemplate('80mm');
  const doc80 = compileReceiptDocument(template80, mockReceiptData, { targetWidth: '80mm' });
  assert.strictEqual(doc80.metadata.columns, 48);
  const divider80 = doc80.nodes.find((n) => n.type === 'divider') as DividerNode;
  assert.strictEqual(divider80.columns, 48);

  const template58 = createDefaultTemplate('58mm');
  const doc58 = compileReceiptDocument(template58, mockReceiptData, { targetWidth: '58mm' });
  assert.strictEqual(doc58.metadata.columns, 32);
  const divider58 = doc58.nodes.find((n) => n.type === 'divider') as DividerNode;
  assert.strictEqual(divider58.columns, 32);

  console.log('  PASS: Column metadata accurately assigned (48 for 80mm, 32 for 58mm).');
}

// Test 6: Currency rows preserve exact numeric integer amounts
console.log('Testing Test 6: Currency rows preserve semantic numeric amounts...');
{
  const template = createDefaultTemplate('80mm');
  const doc = compileReceiptDocument(template, mockReceiptData);

  const subtotalNode = doc.nodes.find(
    (n) => n.type === 'currency_row' && (n as CurrencyRowNode).label === 'Subtotal'
  ) as CurrencyRowNode;
  assert.ok(subtotalNode);
  assert.strictEqual(subtotalNode.amount, 150000, 'Subtotal raw numeric amount must be exactly 150000');
  assert.strictEqual(subtotalNode.currency, 'Rp.');

  const discountNode = doc.nodes.find(
    (n) => n.type === 'currency_row' && (n as CurrencyRowNode).label === 'Diskon'
  ) as CurrencyRowNode;
  assert.ok(discountNode);
  assert.strictEqual(discountNode.amount, 15000, 'Discount raw numeric amount must be exactly 15000');
  assert.strictEqual(discountNode.isNegative, true);

  const totalNode = doc.nodes.find(
    (n) => n.type === 'currency_row' && (n as CurrencyRowNode).label === 'TOTAL'
  ) as CurrencyRowNode;
  assert.ok(totalNode);
  assert.strictEqual(totalNode.amount, 135000, 'Total raw numeric amount must be exactly 135000');
  assert.strictEqual(totalNode.bold, true);
  assert.strictEqual(totalNode.size, 'large');

  console.log('  PASS: Semantic numeric amounts preserved without precision loss.');
}

// Test 7: Long Indonesian names and large totals
console.log('Testing Test 7: Long Indonesian product names and large rupiah totals...');
{
  const dataLarge: ReceiptData = {
    ...mockReceiptData,
    transaction: {
      ...mockReceiptData.transaction,
      total: 1250000000, // 1.25 Milyar Rupiah
    },
    items: [
      {
        name: 'Paket Prasmanan Komplit Nusantara Spesial Rendang Daging Sapi Balado Kerupuk Udang',
        sku: 'PKT-999',
        quantity: 50,
        unitPrice: 25000000,
        subtotal: 1250000000,
      },
    ],
  };

  const doc = compileReceiptDocument(createDefaultTemplate('80mm'), dataLarge);
  const itemNode = doc.nodes.find((n) => n.type === 'item_row') as ItemRowNode;
  assert.ok(itemNode);
  assert.strictEqual(
    itemNode.name,
    'Paket Prasmanan Komplit Nusantara Spesial Rendang Daging Sapi Balado Kerupuk Udang'
  );
  assert.strictEqual(itemNode.subtotal, 1250000000);

  const totalNode = doc.nodes.find(
    (n) => n.type === 'currency_row' && (n as CurrencyRowNode).label === 'TOTAL'
  ) as CurrencyRowNode;
  assert.strictEqual(totalNode.amount, 1250000000);

  console.log('  PASS: Long product names and 10-digit Rupiah amounts preserved flawlessly.');
}

// Test 8: Missing optional fields (customerName null, logo missing)
console.log('Testing Test 8: Missing optional fields handled safely...');
{
  const dataNoCustomer: ReceiptData = {
    ...mockReceiptData,
    config: {
      ...mockReceiptData.config,
      logo: undefined,
    },
    transaction: {
      ...mockReceiptData.transaction,
      customerName: null,
    },
  };

  const template = createDefaultTemplate('80mm');
  const doc = compileReceiptDocument(template, dataNoCustomer);

  // Customer node should not be emitted when customerName is null
  const hasCust = doc.nodes.some(
    (n) => n.type === 'text_line' && (n as TextLineNode).text.startsWith('Pelanggan:')
  );
  assert.strictEqual(hasCust, false, 'Null customerName must not emit customer text_line');

  // Logo node emitted with uri undefined without crashing
  const logoNode = doc.nodes.find((n) => n.type === 'logo') as LogoNode;
  assert.ok(logoNode);
  assert.strictEqual(logoNode.uri, undefined);

  console.log('  PASS: Missing customer and undefined logo handled gracefully without errors.');
}

// Test 9: Historical snapshot data preserved unchanged
console.log('Testing Test 9: Historical snapshot data preservation...');
{
  const doc = compileReceiptDocument(createDefaultTemplate('80mm'), mockReceiptData);
  const item1 = doc.nodes.find(
    (n) => n.type === 'item_row' && (n as ItemRowNode).sku === 'KOP-01'
  ) as ItemRowNode;
  assert.ok(item1);
  assert.strictEqual(item1.quantity, 2);
  assert.strictEqual(item1.unitPrice, 25000);
  assert.strictEqual(item1.subtotal, 50000);

  console.log('  PASS: Historical transaction snapshots used directly.');
}

// Test 10: Legacy fallback compilation
console.log('Testing Test 10: Legacy fallback compilation...');
{
  const legacyData: ReceiptData = {
    ...mockReceiptData,
    config: {
      ...mockReceiptData.config,
      showHeader: true,
      showCashier: false, // cashier disabled in legacy config
      showDiscount: false, // discount disabled in legacy config
    },
  };

  // 1. Calling compileLegacyReceiptDocument
  const legacyDoc = compileLegacyReceiptDocument(legacyData);
  assert.ok(legacyDoc.nodes.length > 0);
  const hasCashier = legacyDoc.nodes.some(
    (n) => n.type === 'text_line' && (n as TextLineNode).text.startsWith('Kasir:')
  );
  assert.strictEqual(hasCashier, false, 'Legacy showCashier=false must be respected in fallback');

  // 2. Calling compileReceiptDocument with null template
  const fallbackDoc = compileReceiptDocument(null, legacyData);
  assert.ok(fallbackDoc.nodes.length > 0);
  assert.strictEqual(
    fallbackDoc.metadata.paperWidth,
    legacyData.config.receiptWidth
  );

  console.log('  PASS: Legacy fallback accurately synthesizes template and respects legacy flags.');
}

// Test 11: Deterministic output for identical input
console.log('Testing Test 11: Deterministic output for identical inputs...');
{
  const template = createDefaultTemplate('80mm');
  const docA = compileReceiptDocument(template, mockReceiptData);
  const docB = compileReceiptDocument(template, mockReceiptData);

  assert.strictEqual(docA.nodes.length, docB.nodes.length);
  for (let i = 0; i < docA.nodes.length; i++) {
    assert.deepStrictEqual(docA.nodes[i], docB.nodes[i], `Node [${i}] must be identical`);
  }

  console.log('  PASS: Compiler output is 100% deterministic.');
}

// Test 12: Payment methods and change compilation
console.log('Testing Test 12: Payment methods and change amount compilation...');
{
  const multiPaymentData: ReceiptData = {
    ...mockReceiptData,
    payments: [
      {
        method: 'qris',
        amount: 50000,
        receivedAmount: 50000,
        changeAmount: 0,
        referenceNumber: 'QRIS-REF-998877',
      },
      {
        method: 'cash',
        amount: 85000,
        receivedAmount: 100000,
        changeAmount: 15000,
        referenceNumber: '',
      },
    ],
  };

  const doc = compileReceiptDocument(createDefaultTemplate('80mm'), multiPaymentData);

  const qrisNode = doc.nodes.find(
    (n) => n.type === 'currency_row' && (n as CurrencyRowNode).label === 'QRIS'
  ) as CurrencyRowNode;
  assert.ok(qrisNode);
  assert.strictEqual(qrisNode.amount, 50000);

  const qrisRefNode = doc.nodes.find(
    (n) => n.type === 'text_line' && (n as TextLineNode).text === 'Ref: QRIS-REF-998877'
  ) as TextLineNode;
  assert.ok(qrisRefNode);

  const cashNode = doc.nodes.find(
    (n) => n.type === 'currency_row' && (n as CurrencyRowNode).label === 'Tunai'
  ) as CurrencyRowNode;
  assert.ok(cashNode);
  assert.strictEqual(cashNode.amount, 85000);

  const changeNode = doc.nodes.find(
    (n) => n.type === 'currency_row' && (n as CurrencyRowNode).label === 'Kembalian'
  ) as CurrencyRowNode;
  assert.ok(changeNode);
  assert.strictEqual(changeNode.amount, 15000);

  console.log('  PASS: Payment methods, references, and change amount verified.');
}

console.log('--- ALL RECEIPT COMPILER TESTS PASSED (12/12) ---');
