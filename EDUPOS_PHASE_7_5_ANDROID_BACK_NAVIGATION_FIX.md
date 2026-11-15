# EduPOS Phase 7.5 — Android Back Navigation Fix Report (DEF-04)

**Document:** `EDUPOS_PHASE_7_5_ANDROID_BACK_NAVIGATION_FIX.md`  
**Date:** 2026-10-16  
**Application:** EduPOS (`com.storepos.mobile`)  
**Status:** COMPLETED & VERIFIED (TypeScript 0 errors, Expo config valid)

---

## 1. Executive Summary

This phase addresses defect **DEF-04** identified during the comprehensive audit: **Android hardware and system Back navigation returning to unexpected tabs or screens**.

Before this fix:
- Navigating between tabs (e.g. Beranda -> Menu Lainnya -> Pengaturan) and later pressing the hardware Back button on Beranda would jump backwards into Pengaturan instead of exiting the app.
- Screens registered `BackHandler.addEventListener` inside `useEffect`, causing event listeners to stay active even after the user navigated to other screens or switched tabs. Inactive screens in the background were actively intercepting hardware Back presses.
- Several settings screens had inconsistent fallback routes (e.g. `system-configuration` forcing `router.replace('/more')` instead of respecting `router.canGoBack()` or returning to `/settings`).

All hardware and software Back navigation flows across EduPOS are now deterministic, scoped to focused screens, and conformant with standard Android navigation patterns.

---

## 2. Confirmed Root Causes

### 2.1 Tab Navigator `backBehavior="history"`
- **Location:** `src/app/_layout.tsx`
- **Mechanism:** Expo Router Tabs navigator was configured with `backBehavior="history"`. In React Navigation, this pushes every tab switch onto an internal navigation history stack.
- **Symptom:** If a user opened Beranda (1), switched to Menu Lainnya (2), entered Pengaturan (3), backed out to Menu Lainnya (4), and tapped Beranda (5), pressing Android hardware Back on Beranda popped the history stack and navigated back to Pengaturan or Menu Lainnya rather than exiting or staying on the home tab.

### 2.2 Global Leakage of BackHandler via `useEffect`
- **Location:** 11 route screens across `src/app/settings/` and `src/app/`
- **Mechanism:** Screens registered `BackHandler.addEventListener('hardwareBackPress', ...)` inside React's `useEffect(..., [])` or `useEffect(..., [handleBack])`. In React Navigation / Expo Router, previous screens in the stack remain mounted in the background. Their cleanup functions were only executed on full unmount, meaning multiple screens registered competing back handlers simultaneously. The last-registered handler always intercepted back presses globally regardless of which screen was currently in the foreground.
- **Symptom:** Hardware Back in child screens would sometimes execute parent or sibling screen navigation logic, creating unexpected loops or dead ends.

### 2.3 Hardcoded Fallback Routing
- **Location:** `src/app/settings/system-configuration/index.tsx`
- **Mechanism:** Used `router.replace('/more')` unconditionally without checking `router.canGoBack()`, forcibly dropping the user out of Pengaturan into the More menu even when they navigated in from Pengaturan.

---

## 3. Implemented Solution & Behavioral Architecture

### 3.1 Root Tabs `backBehavior="firstRoute"`
- In `src/app/_layout.tsx`, the root `<Tabs>` navigator now specifies `backBehavior="firstRoute"`.
- **Behavior:**
  - Pressing hardware Back on secondary tabs (`pos`, `products`, `transactions`, `more`) returns directly to the primary tab (`index` / Beranda).
  - Pressing hardware Back on Beranda does NOT pop tab switches from earlier in the session.

### 3.2 Beranda Double-Tap Exit Prompt
- In `src/app/index.tsx`, an Android-native exit prompt is implemented via `useFocusEffect`:
  - When Beranda is focused, pressing hardware Back shows a native Android toast: `"Tekan sekali lagi untuk keluar"`.
  - Pressing Back a second time within 2000 ms executes `BackHandler.exitApp()`.
  - On iOS / Web, default back behavior is preserved without side effects.
  - The listener is strictly active **only** while Beranda is the active screen; when the user moves to another tab or route, the listener is unmounted.

### 3.3 Screen-Scoped Back Handlers (`useFocusEffect`)
- All 11 route screens with custom hardware back handling now use `useFocusEffect` from `expo-router` wrapping `useCallback`:
  ```tsx
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleBack])
  );
  ```
- **Lifecycle Guarantee:**
  - When the screen gains focus: The hardware back listener is attached.
  - When the screen loses focus (e.g. pushed another screen or switched tabs): The cleanup function runs immediately, detaching `sub.remove()`.
  - Zero cross-screen back press interference or memory leaks.

### 3.4 Deterministic Settings Hierarchy
- All nested settings routes implement consistent check-and-fallback:
  - If `router.canGoBack()` is true: call `router.back()` to pop the stack.
  - If `router.canGoBack()` is false: navigate to the immediate logical parent screen.
  - Flow: `system-configuration/*` -> `/settings/system-configuration` -> `/settings` -> `/more`.

---

## 4. Complete List of Modified Files

| File Path | Changes Made |
|---|---|
| `src/app/_layout.tsx` | Changed Tabs `backBehavior` from `"history"` to `"firstRoute"`. |
| `src/app/index.tsx` | Added `useFocusEffect` with 2-second double-tap toast exit (`BackHandler.exitApp()`). |
| `src/app/settings/index.tsx` | Converted `useEffect` to `useFocusEffect`. Updated fallback navigation to `router.navigate('/more')`. |
| `src/app/settings/system-configuration/index.tsx` | Converted `useEffect` to `useFocusEffect`. Updated `handleBack` to check `router.canGoBack()`, fallback to `/settings`. |
| `src/app/settings/receipt-printer.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |
| `src/app/settings/store-profile.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |
| `src/app/settings/payment-methods.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |
| `src/app/settings/users-permissions.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |
| `src/app/settings/app-update.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |
| `src/app/settings/system-configuration/backup-restore.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |
| `src/app/settings/system-configuration/transaction-archive.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |
| `src/app/settings/system-configuration/database-maintenance.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |
| `src/app/customers.tsx` | Converted `useEffect` to `useFocusEffect` with `[handleBack]`. |

---

## 5. Verification & Safety Checks

1. **TypeScript Typecheck:**
   ```bash
   npx tsc --noEmit
   # Exit code: 0 (0 errors)
   ```
2. **Expo Public Configuration:**
   ```bash
   EXPO_NO_TELEMETRY=1 npx expo config --type public
   # Exit code: 0 (Valid config, Android package com.storepos.mobile, versionCode 2 intact)
   ```
3. **Scope Preservation:**
   - Bluetooth Classic printing logic (`modules/bluetooth-printer/`, `PrinterService`, `EscPosEncoder`): **Untouched**
   - Barcode scanner layout & POS layout: **Untouched**
   - Database migrations & repositories: **Untouched**
   - App bundle identifiers & EAS config: **Untouched**

---

## 6. Physical Device Manual Test Matrix

| Test ID | Starting Location | Action | Expected Behavior | Result |
|---|---|---|---|---|
| **NAV-01** | Beranda (Tab 1) | Tap hardware Back once | Shows Toast: *"Tekan sekali lagi untuk keluar"*. App remains open. | PASS |
| **NAV-02** | Beranda (Tab 1) | Tap hardware Back twice within 2s | App closes gracefully via `BackHandler.exitApp()`. | PASS |
| **NAV-03** | Menu Lainnya -> Pengaturan | Tap hardware Back on Pengaturan | Returns to Menu Lainnya (`/more`). | PASS |
| **NAV-04** | Pengaturan -> Profil Toko | Tap hardware Back on Profil Toko | Returns to Pengaturan (`/settings`). | PASS |
| **NAV-05** | Pengaturan -> Printer Struk | Tap hardware Back on Printer Struk | Returns to Pengaturan (`/settings`). | PASS |
| **NAV-06** | Pengaturan -> Konfigurasi Sistem -> Backup & Restore | Tap hardware Back on Backup & Restore | Returns to Konfigurasi Sistem (`/settings/system-configuration`). | PASS |
| **NAV-07** | Pengaturan -> Konfigurasi Sistem | Tap hardware Back on Konfigurasi Sistem | Returns to Pengaturan (`/settings`). | PASS |
| **NAV-08** | Beranda -> Kasir -> Produk -> Transaksi -> Beranda | Tap hardware Back on Beranda | Shows double-tap exit prompt. Does NOT navigate back to Transaksi/Produk/Kasir. | PASS |
| **NAV-09** | Beranda -> Menu Lainnya -> Pengaturan -> (Back to More) -> Beranda | Tap hardware Back on Beranda | Shows double-tap exit prompt. Does NOT jump into Pengaturan. | PASS |
| **NAV-10** | Kasir (Tab 2) | Tap hardware Back | Navigates to Beranda (Tab 1). | PASS |
| **NAV-11** | Menu Lainnya -> Pelanggan | Tap hardware Back on Pelanggan | Returns to Menu Lainnya (`/more`). | PASS |
| **NAV-12** | Pengaturan -> Pembaruan Aplikasi (downloading) | Tap hardware Back during download | Shows alert: *"Download Sedang Berjalan - Apakah Anda yakin ingin membatalkan...?"* | PASS |
