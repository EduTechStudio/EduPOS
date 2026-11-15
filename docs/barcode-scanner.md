# Barcode Scanner Architecture (Phase 9.5)

## Overview
The application supports barcode scanning and input through a unified `BarcodeService` abstraction. This service normalizes inputs from any source (camera, manual, hardware) to ensure consistent behavior across the app.

## Barcode Normalization
Barcodes are handled strictly as `string` values. 
- Leading zeroes are preserved (e.g., `01234567890`).
- Values are trimmed of whitespace.
- Barcodes are never coerced into numeric types to prevent data loss.

## Product Lookup
The `BarcodeLookupService` provides an exact lookup mechanism. It interfaces with the `ProductRepository` via `getByBarcode()` and strictly avoids fuzzy searching to guarantee precision at the POS.

## Duplicate Prevention (Debouncing)
When using the `CameraView`, the `BarcodeScannerModal` locks scanning immediately upon the first successful read and enforces a 1500ms debounce. This prevents rapid identical reads from incorrectly incrementing cart quantities by 5-10 items.

## Hardware Scanner Foundation
The current `BarcodeSource` types support `camera`, `manual`, and `hardware`. While Bluetooth/USB HID scanning (via keyboard event interception) is not yet implemented, the exact same `BarcodeScanResult` pipeline is prepared to receive those payloads in the future without modifying downstream business logic.

## Supported Formats
The camera currently attempts to decode standard retail formats: `ean13`, `ean8`, `upc_a`, `upc_e`, `qr`, `code128`, and `code39`.
