# EduPOS Phase 7.8 — Preview APK v1.0.2 Build Report

**Application:** EduPOS (`com.storepos.mobile`)  
**Build Profile:** `preview` (Distribution: Internal, Format: Standalone `.apk`)  
**EAS Build ID:** `9ee226e6-0e1c-440c-ace8-370d93ba3380`  
**EAS Dashboard:** https://expo.dev/accounts/edutechs-team/projects/store-pos-mobile/builds/9ee226e6-0e1c-440c-ace8-370d93ba3380  
**Direct APK Download:** https://expo.dev/artifacts/eas/llrZRGW5c4YsPH4tA9Am6t41EQ59E1gNdFMiwj_9pJE.apk  
**Date:** 17 October 2026  
**Status:** BUILD SUCCESS (Finished)  

---

## 1. Version & Identity Configuration

| Attribute | Prior Installed Release | New Preview Build | Status |
| :--- | :--- | :--- | :--- |
| **App Name** | `EduPOS` | `EduPOS` | Preserved |
| **Android Package ID** | `com.storepos.mobile` | `com.storepos.mobile` | **Identical (Required for In-Place Updates)** |
| **App Version** | `1.0.1` | `1.0.2` | **Incremented (SemVer)** |
| **Android versionCode** | `2` | `3` | **Incremented (Android Upgrade Rule)** |
| **EAS Project ID** | `24b60e01-85a2-4d24-a6c9-e27e73e92b57` | `24b60e01-85a2-4d24-a6c9-e27e73e92b57` | Preserved |
| **EAS Account / Owner** | `edutechs-team` | `edutechs-team` | Preserved |
| **Android Keystore** | Cloud-Managed (`q7drOBSH3h`) | Cloud-Managed (`q7drOBSH3h`) | **100% Signing Continuity Reused** |

---

## 2. Pre-Build Validation Audit Results

All prerequisite automated checks passed with zero errors prior to build submission:

1. **TypeScript Static Analysis:**
   ```bash
   npx tsc --noEmit
   # Exit code: 0 (0 compilation errors)
   ```
2. **Expo Public Configuration Resolution:**
   ```bash
   EXPO_NO_TELEMETRY=1 npx expo config --type public
   # Exit code: 0 (Validated SDK 57 config, version 1.0.2, versionCode 3, package com.storepos.mobile)
   ```
3. **ESC/POS Receipt & Logo Unit Tests:**
   ```bash
   node scripts/run-receipt-tests.js
   # ALL UNIT TESTS COMPLETED SUCCESSFULLY (5/5 PASSED)
   # - Missing logo fallback
   # - Valid GS v 0 raster encoding
   # - Word wrapping and column alignment (80 mm & 58 mm)
   # - Binary byte integrity (1065 bytes verified)
   ```
4. **Native Modules Autolinking Check:**
   ```bash
   npx expo-modules-autolinking resolve -p android
   # Exit code: 0 (bluetooth-printer successfully autolinked to expo.modules.bluetoothprinter.BluetoothPrinterModule)
   ```

---

## 3. Scope of Fixes Included in v1.0.2 (`versionCode: 3`)

| Task ID | Component | Defect Resolved |
| :--- | :--- | :--- |
| **DEF-01** | Bluetooth Thermal Printer | Fixed RFCOMM connection drops with reflection fallback (`createRfcommSocket(1)`), thread-safe Kotlin synchronization (`stateLock`), sequential execution queue (`PrintQueue`), and auto-reconnect logic. |
| **DEF-04** | Android Back Navigation | Changed root Tabs `backBehavior="firstRoute"`, added double-tap exit toast on Beranda (`index.tsx`), and converted all 12 custom `BackHandler` listeners to `useFocusEffect` to eliminate background listener leaks. |
| **DEF-03** | Thermal Receipt Logo | Added standard ESC/POS raster bit-image encoding (`GS v 0`), monochrome conversion with luminance thresholding, and native Android `BitmapFactory` decoding for store profile logos. |
| **DEF-05** | Fixed-Width Receipt Alignment | Replaced naive string padding and hard truncation with deterministic multi-line word wrapping and flush-right column alignment (`formatRow`) for 80 mm and 58 mm paper. |
| **DEF-06** | POS Portrait Layout | Reclaimed ~116dp+ of vertical space on mobile phones by hiding redundant `SectionHeader` on phones, compacting container padding and search input, locking category bar height to 40dp, and adding 96dp bottom clearance above the floating cart bar. |

---

## 4. In-Place Installation & Data Safety Instructions

> [!CAUTION]
> **CRITICAL DATA SAFETY WARNING:**
> - **DO NOT UNINSTALL** the currently installed EduPOS app from your Android phone!
> - **DO NOT CLEAR APP STORAGE** ("Hapus Penyimpanan") in Android Settings!
> - Uninstalling an app on Android permanently wipes `/data/data/com.storepos.mobile/` and destroys your local SQLite database (`store-pos.db`).

### Step-by-Step In-Place Upgrade Procedure:

1. **Pre-Update Safety Backup:**
   - On your physical phone, open the currently installed EduPOS app (`v1.0.1`).
   - Go to **Menu Lainnya > Pemeliharaan Sistem > Backup & Restore** (Cadangan & Pemulihan).
   - Tap **Buat Cadangan Baru** and export/save the JSON backup file to external storage or Google Drive.
2. **Download the New APK:**
   - Download the `v1.0.2` APK from the EAS Build URL directly onto your Android phone.
3. **Execute In-Place Install:**
   - Open your Android phone's **Downloads** folder or notification shade.
   - Tap the downloaded `v1.0.2` APK file.
   - Android will prompt: **"Do you want to update this app? Your existing data will not be lost."** (Ingin memperbarui aplikasi ini? Data yang sudah ada tidak akan hilang).
   - Tap **"Update"** (Perbarui).
4. **Signature Conflict Troubleshooting:**
   - Because this build reuses the exact same EAS Cloud-Managed Keystore (`q7drOBSH3h`), Android will recognise the certificate and perform an in-place binary refresh.
   - If Android ever displays an "App not installed as package appears to be invalid" error, **DO NOT UNINSTALL THE OLD APP**. Stop and report the message for inspection.

---

## 5. Physical Device Manual Testing Checklist

Once the APK is installed on the physical device, execute the following manual tests:

- [ ] **1. Data Persistence:** Open Katalog Produk and Riwayat Transaksi. Confirm all existing custom products, categories, stock, and transactions remain intact.
- [ ] **2. POS Portrait Viewport:** Open Kasir in portrait mode. Verify category chips are 40dp high, search bar is compact, and 2.5–3 product rows are clearly visible above the fold.
- [ ] **3. Floating Cart Bar:** Add 2 products to cart. Confirm the bottom floating cart bar appears, does not overlap the last row of products, and scrolls smoothly.
- [ ] **4. Barcode Camera Scanning:** Tap the camera icon in Kasir. Scan physical barcode labels. Confirm autofocus, instant product resolution, and smooth addition to cart.
- [ ] **5. Android Hardware Back Button:** From Beranda, navigate through Lainnya -> Pengaturan -> Printer & Struk. Press Android hardware Back button step-by-step. On Beranda, press Back twice to verify the exit toast ("Tekan sekali lagi untuk keluar").
- [ ] **6. Bluetooth Pairing (Iware MP-81MPO):** Go to Pengaturan > Printer & Struk. Tap "Cari Printer Paired". Select the Iware MP-81MPO. Tap "Tes Cetak Printer".
- [ ] **7. Physical Receipt Logo & 80 mm Alignment:** Print a real transaction receipt. Verify that the store logo prints centered at the top in monochrome (`GS v 0`), columns align flush-right on 80 mm paper, and long Indonesian product names wrap cleanly without truncation.
