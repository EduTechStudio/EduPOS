# EduPOS — Pre-Build Development & Database Safety Audit

**Project:** EduPOS (`com.storepos.mobile`)  
**Investigation Date:** October 2026  
**Auditor:** Antigravity AI  
**Scope:** Pre-Build Environment Classification, Database Safety Trace, and Verification Plan  
**Status:** Strictly READ-ONLY (No code, configurations, database records, or version codes modified)

---

## 1. Executive Summary

This audit establishes a safe, clear distinction between what can and should be tested in the Expo development/emulator environment versus what strictly requires a physical Android device, while providing an exhaustive analysis of the database persistence concern and a non-destructive roadmap for validation.

### Key Conclusions:
1. **Zero Active Blockers:** TypeScript typecheck passes with **0 errors**, Expo public config is **valid**, and ESC/POS receipt unit tests pass **5/5**.
2. **Database Persistence Verified:** There is **zero destructive code** in migrations (`001`–`007`), startup seeding, or repositories that deletes manual product data during normal operation or in-place upgrades.
3. **Missing Data Root Causes Clarified:**
   - **Environment Isolation:** Expo Go (`host.exp.exponent`) and Standalone APK (`com.storepos.mobile`) maintain completely separate, isolated SQLite databases. Data entered in Expo Go does not carry over to an installed APK.
   - **Uninstallation Erases Data:** Android OS permanently purges `/data/data/<package>/` when an app is uninstalled. If a previous test APK was uninstalled before installing an update, manual data was wiped by the OS, and subsequent demo seeding created the impression that only demo data survived.
   - **Inactive Filter Illusion:** Products or categories with `is_active = 0` are excluded from POS and product lists by default (`WHERE is_active = 1`).
4. **Environment Split:**
   - **Emulator / Expo Go:** Suitable for POS portrait layout, search/filter, category chips, cart/checkout, stock tracking, transactions, and UI Back navigation.
   - **Physical Device:** Mandatory for local native Bluetooth Classic printing (Iware MP-81MPO), physical thermal raster output (`GS v 0`), camera barcode scanning, and in-place APK upgrade verification.

---

## 2. Findings & Severity Classification

| Severity | ID | Subsystem | File & Lines | Description & Impact |
| :--- | :--- | :--- | :--- | :--- |
| **High** | ENV-01 | Architecture / Tooling | `modules/bluetooth-printer/` | **Expo Go Native Module Incompatibility:** The custom Bluetooth Classic module (`modules/bluetooth-printer`) contains native Android Kotlin code (`BluetoothPrinterModule.kt`). Standard Expo Go cannot execute this native module. In Expo Go, the app relies on internal mock shims (`BluetoothPrinter.isAvailable() === false`). Full native execution requires either a development build (`npx expo run:android`) or a standalone APK. |
| **High** | DAT-01 | Database / Operating System | Android Sandbox Architecture | **Uninstallation Data Wiping:** Android OS kernel guarantees that deleting or uninstalling an app purges `/data/data/com.storepos.mobile/` completely. Testers must never uninstall the app when testing upgrade persistence. |
| **Medium** | DAT-02 | Repository Querying | `src/database/repositories/ProductRepository.ts:55-82` | **Inactive Product Filtering:** `ProductRepository.search()` enforces `WHERE is_active = 1` by default. Manual products saved with `is_active = 0` or assigned to an inactive category will not appear in POS or standard catalog views, creating an illusion of data loss. |
| **Medium** | PRN-01 | Bluetooth Printer | `src/services/printer/BluetoothPrinterService.ts:196-207` | **Partial-Write Resend Risk:** If RFCOMM connection drops mid-stream (e.g. paper roll depleted mid-print), reconnecting will retransmit the full receipt payload. This may result in a partial slip followed by the complete receipt ticket. |
| **Low** | PRN-02 | Hardware Specification | `src/services/printer/EscPosEncoder.ts:230-233` | **Manual Tear Bar:** Iware MP-81MPO features a manual tear bar rather than a motorized cutter. Sending `cut()` (`GS V A 16`) is ignored by hardware; 3 feed lines are provided for manual tearing. |

---

## 3. Emulator vs. Physical-Device Test Matrix

| Feature / Subsystem | Testable in Expo Go (JS Only) | Testable in Android Emulator | Requires Physical Device | Notes & Constraints |
| :--- | :---: | :---: | :---: | :--- |
| **POS Portrait Layout** | **YES** | **YES** | Optional | Viewport heights, category chips, search bar, card padding, and floating cart bar clearance can be fully validated on emulator or Expo Go. |
| **Android Back Navigation** | Partial | **YES** | Optional | Android hardware Back button, double-tap exit toast on Beranda, and settings hierarchy can be tested on Android Emulator. |
| **Product, Category, Customer CRUD** | **YES** | **YES** | Optional | Full SQLite CRUD operates identically in emulator SQLite. |
| **Search, Cart, Stock & Checkout** | **YES** | **YES** | Optional | Cart calculations, atomic transaction commits, stock deductions, and receipts history work 100% in emulator. |
| **Receipt Preview & Store Logo Config** | **YES** | **YES** | Optional | Logo upload, preview rendering, and configuration storage testable in emulator. |
| **Barcode Scanning** | Simulated | Virtual Scene Only | **MANDATORY** | Expo Camera in emulator shows static scenes or webcam. Autofocus, real barcode labels, and low-light scanning require physical device camera. |
| **Bluetooth Pairing & RFCOMM Sockets** | No (Shim) | No (No BT HW) | **MANDATORY** | Android emulators do not support Bluetooth Classic SPP passthrough. Physical RFCOMM communication with Iware MP-81MPO requires physical hardware. |
| **Thermal Receipt Logo (`GS v 0`)** | Unit Test | Unit Test | **MANDATORY** | Visual inspection of 203 DPI thermal head dot density and paper feed alignment requires physical thermal paper. |
| **In-Place APK Upgrade & DB Persistence** | NO | Partial (`adb install -r`) | **MANDATORY** | Real Android package installer upgrade flow (`REQUEST_INSTALL_PACKAGES` via `expo-intent-launcher`) requires physical device. |

---

## 4. In-Depth Database Safety Audit

### 4.1 Database Path & Lifecycle Trace
- **Configuration:** Hardcoded in `src/database/database.ts:5`: `const DATABASE_NAME = 'store-pos.db';`.
- **Opening:** Single point of opening in `src/database/database.ts:25`: `SQLite.openDatabaseAsync(DATABASE_NAME)`.
- **Filesystem Paths on Android:**
  - Standalone Production APK: `/data/data/com.storepos.mobile/databases/store-pos.db`
  - Expo Go Development: `/data/data/host.exp.exponent/databases/store-pos.db`
- **Integrity Pragmas:** `PRAGMA foreign_keys = ON;` and `PRAGMA journal_mode = WAL;` (Write-Ahead Logging ensures database durability across app restarts).

### 4.2 Migration Audit (`001` through `007`)
All migrations in `src/database/migrations/` were audited:
- Tracking table: `_migrations` ensures each migration executes at most once.
- Transaction wrapping: Each migration is enclosed in `db.withTransactionAsync()`.
- **Finding:** There are **zero** `DROP TABLE products`, `ALTER TABLE products DROP COLUMN`, or destructive `DELETE` statements across all migrations.

### 4.3 Startup Seeding vs. Demo Seeding
- **Startup Seeding (`src/database/seed.ts`):**
  - Runs automatically on every launch after migrations.
  - Inserts/updates ONLY system roles, permissions, default admin users, and basic settings (`INSERT OR IGNORE` / `ON CONFLICT DO UPDATE`).
  - **Explicitly does NOT touch products, categories, or customers.**
- **Manual Demo Seeding (`src/database/seed/demo/seedDemoData.ts`):**
  - Runs ONLY when the user clicks "Buat Data Demo" in Maintenance settings.
  - Guarded by `isDemoSeeded()`: if any product starting with `DEMO_PROD_` exists, it aborts.
  - Uses `INSERT OR IGNORE` with hardcoded IDs (`DEMO_PROD_*`).
  - **Never deletes, modifies, or overwrites user products (`prod_*`).**

### 4.4 Data Deletion Vectors in Code
The only code paths capable of deleting products are:
1. **Explicit User Deletion:** `ProductRepository.delete(id)` triggered from product details UI.
2. **Factory Reset:** `database-maintenance.tsx:102` (`handleFactoryReset`), which requires confirming a warning prompt and manually triggers `DELETE FROM products;`.
3. **Backup Restore:** `BackupService.restoreBackup()`, which clears tables before restoring data from a chosen JSON backup file.

### 4.5 Synthesis: Cause of Missing Manual Products
| Hypothesis | Verified Finding | Probability |
| :--- | :--- | :---: |
| **Destructive migration deleted products** | Audited migrations 001–007; zero destructive SQL found. | **0% (Disproven)** |
| **Startup seeding wiped table** | Startup seed explicitly excludes products and categories. | **0% (Disproven)** |
| **App uninstalled prior to updating APK** | Android OS deletes `/data/data/<pkg>` on uninstall. If tester uninstalled the APK before installing the new build, all data was wiped. Subsequent demo seed left only demo data. | **Very High** |
| **Tester switched between Expo Go and Standalone APK** | Expo Go uses `host.exp.exponent` database; Standalone APK uses `com.storepos.mobile` database. Data does not bridge across environments. | **High** |
| **Products hidden due to `is_active = 0`** | Inactive products are filtered out from POS and catalog by default. | **Moderate** |
| **Restore executed with old demo backup** | If backup restore was tested using an early demo backup file, all newer manual records were replaced. | **Moderate** |

---

## 5. Safe Development & Emulator Testing Plan

To test UI, navigation, and POS catalog improvements in development without any risk to physical device databases:

### Phase A: Non-Destructive Static Checks (Local Machine)
Ensure build and type safety before launching:
```bash
# 1. Type check
npx tsc --noEmit

# 2. Config validation
EXPO_NO_TELEMETRY=1 npx expo config --type public

# 3. Receipt encoder & alignment tests
node scripts/run-receipt-tests.js
```

### Phase B: Launching Development Environment (Emulator)
```bash
# Start Expo development server targeting Android emulator
EXPO_NO_TELEMETRY=1 npx expo start --android
```
- **Note on Expo Go:** When connecting via Expo Go, Bluetooth printing will run in mock mode (`BluetoothPrinter.isAvailable() === false`), logging simulated print transmissions to the console.
- **Note on Dev Build:** To run native code in the emulator:
  ```bash
  npx expo run:android
  ```

### Phase C: Safe Testing Sequence in Emulator
1. **Verify Clean Isolated Database:**
   - In emulator, open *Menu Lainnya -> Pemeliharaan Database*.
   - Tap *Verifikasi Integritas Database* to inspect table counts in the emulator's private database.
2. **Seed Disposable Test Data:**
   - Tap *Buat Data Demo* to populate sample categories and products.
   - Or create 2 manual products with custom names, barcodes, and stock.
3. **Validate POS Portrait Layout:**
   - Rotate emulator to Portrait mode (default mobile dimensions e.g. 1080x2400).
   - Verify category selector bar is fixed at 40dp height with no vertical clipping.
   - Confirm that SectionHeader is hidden on phone portrait and only visible on tablet.
   - Verify that 2.5 to 3 rows of product cards are visible above the fold.
   - Add items to cart; confirm floating cart bar displays with proper padding and does not obstruct scrolling to the last product item.
4. **Validate Android Back Navigation:**
   - Navigate from Beranda -> Lainnya -> Pengaturan -> Printer & Struk.
   - Press emulator Back button (or Back key shortcut `Cmd+M` / system back).
   - Confirm step-by-step return: `receipt-printer` -> `settings` -> `more` -> `index`.
   - On Beranda, press Back once -> verify Toast "Tekan sekali lagi untuk keluar".
   - Press Back again within 2 seconds -> verify app exits.

---

## 6. Tests Reserved Exclusively for Next APK Build (Physical Device)

The following tests **cannot** be concluded in the emulator and must be executed using the next APK on a physical Android device:

1. **Physical Iware MP-81MPO Thermal Printing:**
   - Connect via Bluetooth Classic SPP.
   - Verify RFCOMM reflection fallback (`createRfcommSocket(1)`).
   - Test print execution queue serialization.
2. **Physical Receipt Logo Rendering:**
   - Verify `GS v 0` monochrome raster rendering on 80 mm thermal paper.
   - Confirm logo centering and aspect ratio on physical paper.
3. **Physical Barcode Camera Scanning:**
   - Camera autofocus, real barcode symbologies (EAN-13, Code 128), and scan-to-cart latency.
4. **Physical In-Place APK Upgrade & Database Preservation:**
   - Install APK `versionCode: 3` directly over `versionCode: 2` via `adb install -r` or in-app updater.
   - Verify pre-existing manual products and transactions persist completely.

---

## 7. Recommended Next Steps

1. **Review and approve this audit report.**
2. **Conduct emulator development testing** for POS portrait layout and navigation if further visual tuning is desired.
3. **Trigger internal preview APK build** (`eas build --profile preview --platform android` or local release build) to proceed with physical device hardware testing.
