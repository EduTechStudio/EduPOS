# EduPOS Phase 7.6 — Receipt Logo & 80 mm Alignment Report (DEF-03 + DEF-05)

**Document:** `EDUPOS_PHASE_7_6_RECEIPT_LOGO_ALIGNMENT.md`  
**Date:** 2026-10-16  
**Application:** EduPOS (`com.storepos.mobile`)  
**Target Hardware:** Iware MP-81MPO, Bluetooth Classic, 80 mm Thermal Paper  
**Status:** COMPLETED & VERIFIED (TypeScript 0 errors, Expo config valid, Unit tests 5/5 PASSED)

---

## 1. Executive Summary

This phase resolves defects **DEF-03** (Thermal receipt logo absent from physical printing while visible in on-screen preview) and **DEF-05** (Simplistic space-padding causing misaligned columns, truncated labels, and awkward wrapping on 80 mm and 58 mm receipts).

### Key Results
1. **Logo Printing (DEF-03):** Implemented standard ESC/POS raster bit-image encoding (`GS v 0`) in `EscPosEncoder`, paired with `ImageRaster` service for monochrome conversion and native Android `BitmapFactory` support. Logo printing is binary-safe, centers automatically, preserves aspect ratio, caps dimensions to 384x200 dots for 80 mm paper (256x200 for 58 mm), and degrades gracefully without throwing if an image is missing or invalid.
2. **Fixed-Width Receipt Alignment (DEF-05):** Replaced naive string padding and hard truncation with deterministic multi-line word wrapping and flush-right column alignment (`formatRow`). Indonesian item names wrap on word boundaries without mid-word breaks; quantities, unit prices, and large Rupiah amounts (e.g. `Rp 1.500.000.000`) remain completely intact without overlapping or truncating.
3. **Dual Paper Support:** Preserved exact 80 mm (48 columns) and 58 mm (32 columns) modes.
4. **Validation:** 5/5 focused unit tests passed covering missing logos, valid raster encoding, word wrapping, 80mm/58mm column boundaries, and binary byte integrity. TypeScript compilation passed with 0 errors.

---

## 2. Confirmed Root Causes

### 2.1 Logo Absent from Physical Receipts (DEF-03)
- **Preview vs. Print Divergence:** In `ReceiptPreview.tsx`, the store logo was rendered using React Native's `<Image source={{ uri: receiptData.config.logo }} />`, which renders directly into the UI tree.
- **Missing Encoder Logic:** In `EscPosEncoder.ts`, the encoder had **zero raster image encoding methods**. The receipt encoding method `encodeReceipt` only handled text commands (`text`, `textLine`, `newline`). It completely ignored `config.showLogo` and `config.logo`.
- **Data Pipeline Disconnect:** `BluetoothPrinterService.printReceipt` passed `ReceiptData` directly into `EscPosEncoder` without resolving or rasterizing the local image file URI into raw ESC/POS binary dots.

### 2.2 Alignment & Truncation on 80 mm Paper (DEF-05)
- **Naive Space Padding:** `EscPosEncoder.row(col1, col2)` used:
  ```ts
  const spaceCount = this.columns - (col1.length + col2.length);
  if (spaceCount > 0) {
    this.text(col1 + ' '.repeat(spaceCount) + col2);
  } else {
    this.text(col1.substring(0, this.columns - col2.length - 1) + ' ' + col2);
  }
  ```
- **Violent Truncation:** When `col1.length + col2.length >= this.columns`, it executed `substring(0, ...)` directly on `col1`, chopping off product names, customer names, or transaction numbers.
- **Uncontrolled Line Spilling:** For item names longer than 48 characters, `textLine(item.name)` sent a continuous string, leaving line breaking to the printer hardware which split words arbitrarily across characters.
- **Large Rupiah Amounts:** In retail environments with long quantities or multi-million Rupiah subtotals (e.g. `10x @ Rp 250.000` and `Rp 2.500.000`), `col1 + col2` exceeded column limits and truncated prices or labels.

---

## 3. Implementation Approach

### 3.1 ESC/POS Raster Bit-Image Encoding (`GS v 0`)
- Standard ESC/POS command: `0x1D 0x76 0x30 0x00 xL xH yL yH d1...dk`
  - `m = 0x00`: Normal mode (1:1 aspect ratio, 203 DPI)
  - `xL, xH`: Number of horizontal bytes (`Math.ceil(width / 8)`)
  - `yL, yH`: Number of vertical dots (`height`)
  - `data`: 1-bit packed monochrome bytes (1 = black dot / heated, 0 = white paper). Bit 7 (MSB) is the leftmost pixel.
- Center alignment: Centering (`ESC a 1`) is sent immediately before `GS v 0`, followed by a line feed and reset to left alignment (`ESC a 0`).
- Implemented in `EscPosEncoder.rasterImage(raster: RasterBitmap)`.

### 3.2 Dual-Tier Image Processing Architecture (`ImageRaster.ts`)
To adhere to the requirement of not breaking dependencies while ensuring physical printer compatibility:
1. **Tier 1 (Native Platform Decoding):**
   - Implemented `decodeImageToRaster(source, maxWidth, maxHeight)` in `BluetoothPrinterModule.kt` using Android's native `BitmapFactory`.
   - Natively supports PNG, JPEG, WebP, BMP, and `content://` / `file://` / base64 URIs.
   - Decodes, scales down to `maxWidth` (384 dots for 80 mm, 256 dots for 58 mm) while strictly preserving aspect ratio, converts transparent pixels to white background, thresholds grayscale luminance (`0.299*R + 0.587*G + 0.114*B < 128`), packs bits into bytes, and recycles bitmaps.
2. **Tier 2 (Pure TypeScript Fallback & Test Engine):**
   - Built a zero-dependency pure TypeScript BMP decoder (`parseBmpToRaster`) supporting 1-bpp, 24-bpp, and 32-bpp uncompressed Windows Bitmap files.
   - Runs identically in Hermes and Node.js without native module requirements.
3. **Graceful Fallback Guarantee:**
   - If image file is missing, invalid, or decoding fails, `convertImageToRaster` catches errors and returns `null`.
   - `EscPosEncoder.encodeReceipt` checks `if (config.showLogo !== false && logoRaster)` and proceeds smoothly with text printing if no raster is available.

### 3.3 Deterministic Fixed-Width Alignment (`EscPosEncoder.ts`)
1. **Word Wrapping (`wrapText`):**
   - Splits paragraphs on word boundaries so that no line exceeds `maxWidth` (48 for 80 mm, 32 for 58 mm).
   - If an unbroken word is longer than `maxWidth`, it partitions the word cleanly without infinite loops.
2. **Deterministic Two-Column Alignment (`formatRow`):**
   - Single-line path: When `left.length + right.length + 1 <= totalWidth`, calculates exact spacing so `right` is flush right at column 48 (or 32).
   - Multi-line path: When left text is long, wraps `left` cleanly. If the last line of `left` has sufficient space, right text is appended flush right on that line. If not, right text is placed on its own line padded flush to the right margin.
   - **Zero truncation:** Product names and Rupiah amounts are never cut off.
3. **Line Items:**
   - Line 1+: Word-wrapped product name.
   - Next line: Indented quantity & unit price (`  2x @ Rp 25.000`) on left, subtotal (`Rp 50.000`) flush right.
4. **Header & Footer:**
   - Store name, store address, and footer text wrap cleanly by words with proper centering.

---

## 4. Modified & Created Files

| File | Status | Description |
|---|---|---|
| `src/services/printer/ImageRaster.ts` | **Created** | Monochrome raster conversion, 1-bit bit packing, BMP decoder, and image loader. |
| `src/services/printer/EscPosEncoder.ts` | **Updated** | Added `rasterImage()`, `formatRow()`, `wrapText()`, and refactored `encodeReceipt()` / `encodeTest()`. |
| `src/services/receipt/ReceiptService.ts` | **Updated** | Added `logoRaster?: RasterBitmap` to `ReceiptData` interface. |
| `src/services/printer/BluetoothPrinterService.ts` | **Updated** | Asynchronously resolves logo raster via `convertImageToRaster` before encoding. |
| `modules/bluetooth-printer/index.ts` | **Updated** | Exported `decodeImageToRaster` on `BluetoothPrinter`. |
| `modules/bluetooth-printer/android/src/main/java/expo/modules/bluetoothprinter/BluetoothPrinterModule.kt` | **Updated** | Added native `decodeImageToRaster` using `BitmapFactory` with scaling & luminance thresholding. |
| `test/receipt-logo-alignment.test.ts` | **Created** | Comprehensive unit test suite for DEF-03 and DEF-05. |
| `scripts/run-receipt-tests.js` | **Created** | Standalone test runner for executing unit tests in Node environment. |

---

## 5. Verification Commands & Exact Output

### 5.1 TypeScript Compilation
```bash
npx tsc --noEmit
# Exit code: 0 (0 errors)
```

### 5.2 Expo Configuration
```bash
EXPO_NO_TELEMETRY=1 npx expo config --type public
# Exit code: 0
# Valid JSON configuration with package com.storepos.mobile, versionCode 2 intact.
```

### 5.3 Focused Unit Test Suite
```bash
node scripts/run-receipt-tests.js
```
**Exact Output:**
```text
Running EduPOS receipt logo & alignment test suite...

--- STARTING EDUPOS RECEIPT & LOGO TESTS ---
Testing Test 1: Logo disabled or missing...
  PASS: Logo disabled, missing, or invalid produces clean text header without raster bytes.
Testing Test 2: Valid logo raster bytes...
  PASS: Valid logo raster bytes correctly encoded into ESC/POS GS v 0 command.
Testing Test 3: Large amounts and long Indonesian product names...
  PASS: Long Indonesian names wrap gracefully and large rupiah amounts align flush right.
Testing Test 4: 58 mm (32 cols) and 80 mm (48 cols) row widths...
  PASS: Exact column width constraints (48 for 80mm, 32 for 58mm) verified.
Testing Test 5: Binary byte integrity...
  PASS: Byte integrity verified across all 1065 bytes.
--- ALL UNIT TESTS COMPLETED SUCCESSFULLY (5/5 PASSED) ---
```

---

## 6. Dependency & Runtime Considerations

1. **No External NPM Dependencies:** The implementation introduced zero external npm dependencies, preserving package compatibility and preventing build bloat.
2. **Current Runtime vs. Future Build:**
   - The JavaScript/TypeScript layers (`ImageRaster.ts`, `EscPosEncoder.ts`) work immediately in the Hermes runtime. Uncompressed BMP logos and pre-rendered raster bytes work without requiring a native rebuild.
   - For arbitrary PNG/JPEG formats from device storage, native decoding relies on `BitmapFactory` in `BluetoothPrinterModule.kt`. In the existing installed test APK (`EduPOS-1.0.1.apk`), if `decodeImageToRaster` is not yet compiled into the native binary, the service skips the logo gracefully and prints text cleanly. It activates automatically on the next native APK build.
3. **Safety Restrictions Honored:**
   - Database schema, migrations, and user data: **Untouched**
   - Navigation fixes from DEF-04: **Untouched**
   - Bluetooth connection & reconnect retry logic from DEF-01: **Untouched**
   - Barcode scanner, checkout modal, and POS transactions: **Untouched**
   - Package name, EAS project ID, and version codes: **Untouched**

---

## 7. Physical Printer Verification Checklist

Use this checklist when testing on the physical Iware MP-81MPO printer:

- [ ] **Paper Width Setup:** Verify printer is loaded with 80 mm thermal paper roll and paper guide is seated correctly.
- [ ] **Test Print:** In *Pengaturan > Printer & Struk*, tap *Uji Cetak*. Verify header displays `80mm (48 Kolom)` and left/right test columns align to margins.
- [ ] **Logo Printing Enabled:**
  - In *Profil Toko*, select a logo and save.
  - In *Printer & Struk*, verify *Tampilkan Logo Toko* is enabled.
  - Print a receipt and verify the logo is printed centered at the top without clipping or garbled text.
- [ ] **Logo Printing Disabled:**
  - In *Printer & Struk*, disable *Tampilkan Logo Toko*.
  - Print a receipt and verify the store name appears at the top without blank gaps or raster commands.
- [ ] **Long Product Names:** Add a product with a name longer than 50 characters (e.g. *"Paket Nasi Kotak Ayam Bakar Bumbu Rujak Spesial"*). Verify the name wraps cleanly by words across 2 lines.
- [ ] **Large Currency Amounts:** Transact items with total exceeding Rp 10.000.000. Verify the subtotal and total amounts align flush to the right edge of the paper.
- [ ] **Paper Cut & Feed:** Verify receipt feeds 3 lines cleanly past the tear bar without excessive paper waste.
