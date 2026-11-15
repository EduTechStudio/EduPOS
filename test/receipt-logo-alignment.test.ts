/**
 * Focused Unit Tests for EduPOS Receipt Logo and 80mm/58mm Alignment (DEF-03 + DEF-05)
 */

import { EscPosEncoder } from '@/services/printer/EscPosEncoder';
import { parseBmpToRaster, isBmp, createMonochromeRaster, RasterBitmap } from '@/services/printer/ImageRaster';
import { ReceiptData } from '@/services/receipt/ReceiptService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function findSubsequence(haystack: number[], needle: number[]): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

const mockBaseReceipt: ReceiptData = {
  config: {
    storeName: 'EduPOS Cafe & Mart',
    storeAddress: 'Jl. Merdeka Raya No. 45, Jakarta Selatan',
    storePhone: '081234567890',
    showHeader: true,
    showStoreAddress: true,
    showStorePhone: true,
    showLogo: true,
    showFooter: true,
    footerText: 'Terima Kasih Telah Berbelanja\nBarang yang sudah dibeli tidak dapat ditukar',
    showCashier: true,
    showTransactionNumber: true,
    showDateTime: true,
    showCustomer: true,
    showPaymentMethod: true,
    showDiscount: true,
    showTax: false,
    showSubtotal: true,
    showTotal: true,
    showChange: true,
    receiptWidth: '80mm',
  },
  store: {
    name: 'EduPOS Cafe & Mart',
    address: 'Jl. Merdeka Raya No. 45, Jakarta Selatan',
    phone: '081234567890',
  },
  transaction: {
    transactionNumber: 'TRX-20261016-001',
    date: '16/10/2026',
    time: '21:30',
    cashierName: 'Ahmad Kasir',
    customerName: 'Bapak Muhammad Sulaiman',
    subtotal: 150000,
    discount: 15000,
    total: 135000,
  },
  items: [
    {
      name: 'Kopi Susu Gula Aren Spesial Ukuran Besar',
      sku: 'KOP-01',
      quantity: 2,
      unitPrice: 25000,
      subtotal: 50000,
    },
    {
      name: 'Roti Bakar Keju Cokelat Susu Meleleh',
      sku: 'ROT-02',
      quantity: 1,
      unitPrice: 25000,
      subtotal: 25000,
    },
    {
      name: 'Paket Nasi Goreng Spesial Telur Ceplok dan Kerupuk Udang Gurih',
      sku: 'NAS-03',
      quantity: 2,
      unitPrice: 37500,
      subtotal: 75000,
    },
  ],
  payments: [
    {
      method: 'CASH',
      amount: 135000,
      receivedAmount: 150000,
      changeAmount: 15000,
      referenceNumber: '',
    },
  ],
};

function createMockBmp24(width: number, height: number, fillColor: 'black' | 'white'): Uint8Array {
  const rowStride = Math.floor((width * 3 + 3) / 4) * 4;
  const pixelArraySize = rowStride * height;
  const fileSize = 54 + pixelArraySize;
  const buf = new Uint8Array(fileSize);

  // 'BM'
  buf[0] = 0x42;
  buf[1] = 0x4D;
  // File size
  buf[2] = fileSize & 0xff;
  buf[3] = (fileSize >> 8) & 0xff;
  buf[4] = (fileSize >> 16) & 0xff;
  buf[5] = (fileSize >> 24) & 0xff;
  // Offset to pixels = 54
  buf[10] = 54;
  // DIB header size = 40
  buf[14] = 40;
  // Width
  buf[18] = width & 0xff;
  buf[19] = (width >> 8) & 0xff;
  // Height
  buf[22] = height & 0xff;
  buf[23] = (height >> 8) & 0xff;
  // Planes = 1
  buf[26] = 1;
  // BPP = 24
  buf[28] = 24;
  // Compression = 0 (BI_RGB)
  buf[30] = 0;

  const colorByte = fillColor === 'black' ? 0x00 : 0xff;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = 54 + y * rowStride + x * 3;
      buf[idx] = colorByte;     // B
      buf[idx + 1] = colorByte; // G
      buf[idx + 2] = colorByte; // R
    }
  }

  return buf;
}

console.log('--- STARTING EDUPOS RECEIPT & LOGO TESTS ---');

// Test 1: Logo Disabled or Missing
{
  console.log('Testing Test 1: Logo disabled or missing...');
  const encoder80 = new EscPosEncoder(48);

  // Case 1A: showLogo = false
  const receiptNoLogo = {
    ...mockBaseReceipt,
    config: { ...mockBaseReceipt.config, showLogo: false },
    logoRaster: { width: 16, height: 16, data: new Array(32).fill(0xff) },
  };
  const bytesNoLogo = encoder80.encodeReceipt(receiptNoLogo);
  // GS v 0 signature: 0x1D, 0x76, 0x30
  assert(findSubsequence(bytesNoLogo, [0x1D, 0x76, 0x30]) === -1, 'When showLogo=false, GS v 0 raster command must NOT be emitted.');

  // Case 1B: logoRaster = undefined
  const encoder80B = new EscPosEncoder(48);
  const receiptMissingRaster = {
    ...mockBaseReceipt,
    config: { ...mockBaseReceipt.config, showLogo: true },
    logoRaster: undefined,
  };
  const bytesMissing = encoder80B.encodeReceipt(receiptMissingRaster);
  assert(findSubsequence(bytesMissing, [0x1D, 0x76, 0x30]) === -1, 'When logoRaster is missing, GS v 0 raster command must NOT be emitted.');

  // Case 1C: logoRaster with empty or 0 dimensions
  const encoder80C = new EscPosEncoder(48);
  const receiptEmptyRaster = {
    ...mockBaseReceipt,
    config: { ...mockBaseReceipt.config, showLogo: true },
    logoRaster: { width: 0, height: 0, data: [] },
  };
  const bytesEmpty = encoder80C.encodeReceipt(receiptEmptyRaster);
  assert(findSubsequence(bytesEmpty, [0x1D, 0x76, 0x30]) === -1, 'Empty raster must NOT emit GS v 0.');

  console.log('  PASS: Logo disabled, missing, or invalid produces clean text header without raster bytes.');
}

// Test 2: Valid Logo Raster Bytes & GS v 0 Encoding
{
  console.log('Testing Test 2: Valid logo raster bytes...');
  const encoder80 = new EscPosEncoder(48);

  // 16 dots wide, 8 dots high = 2 bytes per row * 8 rows = 16 bytes
  const testRaster: RasterBitmap = {
    width: 16,
    height: 8,
    data: [
      0xff, 0x00,
      0xaa, 0x55,
      0x12, 0x34,
      0x56, 0x78,
      0x9a, 0xbc,
      0xde, 0xf0,
      0x0f, 0xf0,
      0x00, 0xff,
    ],
  };

  const receiptWithLogo = {
    ...mockBaseReceipt,
    config: { ...mockBaseReceipt.config, showLogo: true },
    logoRaster: testRaster,
  };

  const bytes = encoder80.encodeReceipt(receiptWithLogo);

  // Find GS v 0 0 xL xH yL yH
  // widthBytes = 2 -> xL = 2, xH = 0
  // height = 8 -> yL = 8, yH = 0
  const expectedHeader = [0x1D, 0x76, 0x30, 0x00, 0x02, 0x00, 0x08, 0x00];
  const headerIdx = findSubsequence(bytes, expectedHeader);
  assert(headerIdx !== -1, 'GS v 0 raster header must be present in receipt bytes with exact dimensions.');

  // Verify that raster data bytes follow immediately after the header
  for (let i = 0; i < testRaster.data.length; i++) {
    assert(
      bytes[headerIdx + expectedHeader.length + i] === testRaster.data[i],
      `Raster byte at index ${i} must match input binary data.`
    );
  }

  // Test BMP Parsing
  const blackBmp = createMockBmp24(32, 16, 'black');
  assert(isBmp(blackBmp), 'isBmp must return true for valid BMP');
  const parsed = parseBmpToRaster(blackBmp, 384, 200);
  assert(parsed !== null, 'parseBmpToRaster must parse valid 24-bpp BMP');
  assert(parsed!.width === 32, 'Parsed BMP width must match');
  assert(parsed!.height === 16, 'Parsed BMP height must match');
  // For all black, all bits in raster should be 1 (0xFF)
  for (let i = 0; i < parsed!.data.length; i++) {
    assert(parsed!.data[i] === 0xff, 'Black BMP pixels must result in 1-bits (0xFF)');
  }

  console.log('  PASS: Valid logo raster bytes correctly encoded into ESC/POS GS v 0 command.');
}

// Test 3: Large Amounts and Long Indonesian Product Names
{
  console.log('Testing Test 3: Large amounts and long Indonesian product names...');
  const encoder = new EscPosEncoder(48);

  const longName = 'Paket Nasi Kotak Ayam Bakar Bumbu Rujak Spesial + Es Teh Manis Jumbo + Sambal Terasi Ekstra Pedas';
  const wrapped = encoder.wrapText(longName, 48);
  assert(wrapped.length > 1, 'Long name must wrap across multiple lines.');
  wrapped.forEach((line, idx) => {
    assert(line.length <= 48, `Line ${idx} (${line.length} chars) must not exceed 48 columns.`);
  });

  // Verify total reconstruction has no missing words
  const rejoined = wrapped.join(' ');
  assert(rejoined === longName, 'Word wrapping must not drop words.');

  // Test large amount formatting
  const qtyStr = '  12x @ Rp 125.000.000';
  const totalStr = 'Rp 1.500.000.000';
  const rowFormatted = encoder.formatRow(qtyStr, totalStr, 48);
  const rowLines = rowFormatted.split('\n');
  rowLines.forEach(l => {
    assert(l.length <= 48, `Formatted row line length (${l.length}) must not exceed 48.`);
  });
  // The last line must end with totalStr flush right
  const lastLine = rowLines[rowLines.length - 1];
  assert(lastLine.endsWith(totalStr), 'Right column must be flush right on the last line.');
  assert(lastLine.length === 48, `Last line must be exactly 48 characters wide, got ${lastLine.length}.`);

  console.log('  PASS: Long Indonesian names wrap gracefully and large rupiah amounts align flush right.');
}

// Test 4: 58 mm (32 cols) and 80 mm (48 cols) Row Widths
{
  console.log('Testing Test 4: 58 mm (32 cols) and 80 mm (48 cols) row widths...');

  // 80mm check
  const encoder80 = new EscPosEncoder(48);
  const row80 = encoder80.formatRow('Subtotal', 'Rp 150.000', 48);
  assert(row80.length === 48, `80mm row must have length 48, got ${row80.length}`);
  assert(row80.startsWith('Subtotal'), '80mm row must start with left text');
  assert(row80.endsWith('Rp 150.000'), '80mm row must end with right text');

  // 58mm check
  const encoder58 = new EscPosEncoder(32);
  const row58 = encoder58.formatRow('Subtotal', 'Rp 150.000', 32);
  assert(row58.length === 32, `58mm row must have length 32, got ${row58.length}`);
  assert(row58.startsWith('Subtotal'), '58mm row must start with left text');
  assert(row58.endsWith('Rp 150.000'), '58mm row must end with right text');

  // Separator lengths
  const enc80Sep = new EscPosEncoder(48);
  enc80Sep.separator();
  const sep80 = enc80Sep.getBuffer();
  // 48 dashes (0x2D = 45) + 0x0A (10)
  assert(sep80.filter(b => b === 0x2D).length === 48, '80mm separator must contain exactly 48 dash characters.');

  const enc58Sep = new EscPosEncoder(32);
  enc58Sep.separator();
  const sep58 = enc58Sep.getBuffer();
  assert(sep58.filter(b => b === 0x2D).length === 32, '58mm separator must contain exactly 32 dash characters.');

  console.log('  PASS: Exact column width constraints (48 for 80mm, 32 for 58mm) verified.');
}

// Test 5: Binary Byte Integrity
{
  console.log('Testing Test 5: Binary byte integrity...');
  const encoder = new EscPosEncoder(48);

  const testRaster: RasterBitmap = {
    width: 24,
    height: 4,
    data: [
      0x00, 0x55, 0xAA,
      0xFF, 0x12, 0x34,
      0x80, 0x01, 0xFE,
      0x7F, 0x80, 0xFF,
    ],
  };

  const receipt = {
    ...mockBaseReceipt,
    config: {
      ...mockBaseReceipt.config,
      showLogo: true,
      footerText: 'Kutipan “Spesial” – EduPOS Mart… • Diskon 10%',
    },
    logoRaster: testRaster,
  };

  const bytes = encoder.encodeReceipt(receipt, true);

  // 1. Initialized with ESC @
  assert(bytes[0] === 0x1B && bytes[1] === 0x40, 'Receipt must begin with ESC @ (0x1B, 0x40)');

  // 2. All bytes must be integer in range 0..255
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    assert(
      typeof b === 'number' && Number.isInteger(b) && b >= 0 && b <= 255,
      `Byte at ${i} (${b}) must be an integer between 0 and 255.`
    );
  }

  // 3. Cut command present when autoCut = true: 0x1D, 0x56, 0x41, 0x10
  assert(findSubsequence(bytes, [0x1D, 0x56, 0x41, 0x10]) !== -1, 'Cut command must be present at end of receipt.');

  console.log(`  PASS: Byte integrity verified across all ${bytes.length} bytes.`);
}

// Test 6: Currency Column Alignment (Task 2: Fixed-position Rp. and right-aligned amount)
{
  console.log('Testing Test 6: Currency column alignment (80mm & 58mm)...');
  const enc80 = new EscPosEncoder(48);

  const testCases80 = [
    { label: 'Subtotal', amount: 150000 },
    { label: 'Diskon', amount: 15000, isNeg: true },
    { label: 'TOTAL', amount: 135000 },
    { label: 'TUNAI', amount: 150000 },
    { label: 'Kembali', amount: 15000 },
    { label: '  2x @ Rp 25.000', amount: 50000 },
    { label: 'Item Jutaan 1x', amount: 1500000 },
    { label: 'Item Puluhan Juta 1x', amount: 15000000 },
  ];

  // In 80mm mode, Rp. must always be at column 33 (character index 32)
  testCases80.forEach(({ label, amount, isNeg }) => {
    const row = enc80.formatCurrencyRow(label, amount, 48, { isNegative: isNeg });
    assert(row.length === 48, `Row must be exactly 48 chars wide, got ${row.length} for "${row}"`);
    const rpIndex = row.indexOf('Rp. ');
    assert(rpIndex === 32, `In 80mm mode, 'Rp. ' must start at column index 32, got ${rpIndex} in "${row}"`);
    assert(row.endsWith(Math.abs(amount).toLocaleString('id-ID')), `Row must end with formatted amount in "${row}"`);
  });

  // In 58mm mode, Rp. must always be at column 19 (character index 18)
  const enc58 = new EscPosEncoder(32);
  const testCases58 = [
    { label: 'Subtotal', amount: 150000 },
    { label: 'Diskon', amount: 15000, isNeg: true },
    { label: 'TOTAL', amount: 135000 },
    { label: 'TUNAI', amount: 150000 },
    { label: 'Kembali', amount: 15000 },
    { label: '  2x @ Rp 25.000', amount: 50000 },
  ];

  testCases58.forEach(({ label, amount, isNeg }) => {
    const row = enc58.formatCurrencyRow(label, amount, 32, { isNegative: isNeg });
    assert(row.length === 32, `Row must be exactly 32 chars wide, got ${row.length} for "${row}"`);
    const rpIndex = row.indexOf('Rp. ');
    assert(rpIndex === 18, `In 58mm mode, 'Rp. ' must start at column index 18, got ${rpIndex} in "${row}"`);
    assert(row.endsWith(Math.abs(amount).toLocaleString('id-ID')), `Row must end with formatted amount in "${row}"`);
  });

  console.log('  PASS: Currency column alignment (dedicated Rp. column & right-aligned amount) verified on 80mm and 58mm.');
}

console.log('--- ALL UNIT TESTS COMPLETED SUCCESSFULLY (6/6 PASSED) ---');
