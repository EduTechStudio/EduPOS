/**
 * ImageRaster.ts
 * Monochrome raster conversion and bitmap decoding for ESC/POS thermal printers.
 * Supports standard ESC/POS GS v 0 format (1-bit per dot, MSB first).
 */

export interface RasterBitmap {
  /** Width in dots (multiple of 8 recommended) */
  width: number;
  /** Height in dots */
  height: number;
  /** 1-bit packed binary data. Length = Math.ceil(width / 8) * height */
  data: number[];
}

/**
 * Checks whether the given byte buffer starts with the standard BMP signature 'BM' (0x42, 0x4D).
 */
export function isBmp(bytes: Uint8Array | number[]): boolean {
  if (!bytes || bytes.length < 2) return false;
  return bytes[0] === 0x42 && bytes[1] === 0x4D;
}

/**
 * Creates a packed 1-bit monochrome raster from raw 8-bit grayscale luminance pixels.
 * @param pixels Array of luminance values (0=black, 255=white), length = width * height.
 * @param width Image width in pixels.
 * @param height Image height in pixels.
 * @param threshold Luminance cutoff below which a dot is printed (black). Default 128.
 */
export function createMonochromeRaster(
  pixels: Uint8Array | number[],
  width: number,
  height: number,
  threshold: number = 128
): RasterBitmap {
  const widthBytes = Math.ceil(width / 8);
  const data: number[] = new Array(widthBytes * height).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const lum = pixels[y * width + x];
      // Values below threshold become black dots (printed)
      if (lum < threshold) {
        const byteIndex = y * widthBytes + Math.floor(x / 8);
        const bitIndex = 7 - (x % 8);
        data[byteIndex] |= 1 << bitIndex;
      }
    }
  }

  return { width, height, data };
}

/**
 * Pure TypeScript BMP parser that decodes 1-bpp, 24-bpp, or 32-bpp uncompressed BMP images
 * into a printer-ready 1-bit monochrome raster bitmap.
 * Downscales proportionally if image dimensions exceed maxWidth or maxHeight.
 */
export function parseBmpToRaster(
  bytes: Uint8Array | number[],
  maxWidth: number = 384,
  maxHeight: number = 200
): RasterBitmap | null {
  if (!isBmp(bytes) || bytes.length < 54) {
    return null;
  }

  try {
    const readUint32 = (offset: number) =>
      ((bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0);
    const readInt32 = (offset: number) =>
      (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) | 0;
    const readUint16 = (offset: number) =>
      ((bytes[offset] | (bytes[offset + 1] << 8)) >>> 0);

    const pixelOffset = readUint32(10);
    const rawWidth = readInt32(18);
    const rawHeight = readInt32(22);
    const planes = readUint16(26);
    const bpp = readUint16(28);
    const compression = readUint32(30);

    if (rawWidth <= 0 || rawHeight === 0 || planes !== 1 || compression !== 0) {
      return null;
    }
    if (bpp !== 1 && bpp !== 24 && bpp !== 32) {
      return null;
    }

    const origW = rawWidth;
    const origH = Math.abs(rawHeight);
    const isBottomUp = rawHeight > 0;

    // Calculate scaling factor preserving aspect ratio
    let scale = 1.0;
    if (origW > maxWidth || origH > maxHeight) {
      scale = Math.min(maxWidth / origW, maxHeight / origH);
    }

    // Align target width to multiple of 8 dots for optimal raster printing
    let targetW = Math.max(8, Math.floor((origW * scale) / 8) * 8);
    let targetH = Math.max(1, Math.floor(origH * scale));

    // Stride calculation
    let rowStride = 0;
    if (bpp === 24) {
      rowStride = Math.floor((origW * 3 + 3) / 4) * 4;
    } else if (bpp === 32) {
      rowStride = origW * 4;
    } else if (bpp === 1) {
      rowStride = Math.floor((Math.floor((origW + 7) / 8) + 3) / 4) * 4;
    }

    const widthBytes = Math.ceil(targetW / 8);
    const rasterData: number[] = new Array(widthBytes * targetH).fill(0);

    for (let ty = 0; ty < targetH; ty++) {
      const srcY = Math.min(Math.floor(ty / scale), origH - 1);
      const fileRow = isBottomUp ? origH - 1 - srcY : srcY;

      for (let tx = 0; tx < targetW; tx++) {
        const srcX = Math.min(Math.floor(tx / scale), origW - 1);
        let isBlack = false;

        if (bpp === 24) {
          const idx = pixelOffset + fileRow * rowStride + srcX * 3;
          if (idx + 2 < bytes.length) {
            const b = bytes[idx];
            const g = bytes[idx + 1];
            const r = bytes[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            isBlack = lum < 128;
          }
        } else if (bpp === 32) {
          const idx = pixelOffset + fileRow * rowStride + srcX * 4;
          if (idx + 3 < bytes.length) {
            const b = bytes[idx];
            const g = bytes[idx + 1];
            const r = bytes[idx + 2];
            const a = bytes[idx + 3];
            if (a < 128) {
              isBlack = false; // Transparent treated as white paper
            } else {
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              isBlack = lum < 128;
            }
          }
        } else if (bpp === 1) {
          const byteIdx = pixelOffset + fileRow * rowStride + Math.floor(srcX / 8);
          if (byteIdx < bytes.length) {
            const bitIdx = 7 - (srcX % 8);
            const bitVal = (bytes[byteIdx] >> bitIdx) & 1;
            // In 1-bpp BMP, palette entry 0 is typically black (0), entry 1 is white (1)
            isBlack = bitVal === 0;
          }
        }

        if (isBlack) {
          const byteIndex = ty * widthBytes + Math.floor(tx / 8);
          const bitIndex = 7 - (tx % 8);
          rasterData[byteIndex] |= 1 << bitIndex;
        }
      }
    }

    return {
      width: targetW,
      height: targetH,
      data: rasterData,
    };
  } catch (err) {
    console.warn('[ImageRaster] Failed to parse BMP data:', err);
    return null;
  }
}

/**
 * Resolves an image source (file URI, content URI, or base64 data URL) into a printer-ready monochrome raster.
 * Attempts native platform decoding first via BluetoothPrinter native module (handles JPG, PNG, WebP, etc.).
 * Falls back to pure JS BMP decoding if native module is unavailable or running in a unit-test environment.
 * If unsupported or invalid, returns null gracefully without throwing.
 */
export async function convertImageToRaster(
  source: string | null | undefined,
  maxWidth: number = 384,
  maxHeight: number = 200
): Promise<RasterBitmap | null> {
  if (!source || typeof source !== 'string' || source.trim().length === 0) {
    return null;
  }

  // 1. Attempt native decoding via BluetoothPrinter if available
  try {
    const { BluetoothPrinter } = await import('bluetooth-printer');
    if (BluetoothPrinter.isAvailable() && typeof (BluetoothPrinter as any).decodeImageToRaster === 'function') {
      const nativeResult = await (BluetoothPrinter as any).decodeImageToRaster(source, maxWidth, maxHeight);
      if (nativeResult && nativeResult.width && nativeResult.height && Array.isArray(nativeResult.data)) {
        return nativeResult as RasterBitmap;
      }
    }
  } catch (_nativeErr) {
    // Continue to fallback
  }

  // 2. Fallback: Parse BMP or base64 data
  try {
    let base64 = '';
    if (source.startsWith('data:')) {
      const parts = source.split(',');
      base64 = parts[1] || '';
    } else if (source.startsWith('file://') || source.startsWith('/')) {
      // In React Native / Expo environment
      try {
        const FileSystem = await import('expo-file-system/legacy');
        base64 = await FileSystem.readAsStringAsync(source, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (fsErr) {
        console.warn('[ImageRaster] FileSystem read failed:', fsErr);
      }
    } else {
      // Direct base64 string
      base64 = source;
    }

    if (base64) {
      let bytes: Uint8Array;
      if (typeof atob === 'function') {
        const binaryStr = atob(base64);
        bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
      } else {
        const maybeBuffer = (globalThis as any).Buffer;
        if (maybeBuffer) {
          bytes = new Uint8Array(maybeBuffer.from(base64, 'base64'));
        } else {
          bytes = new Uint8Array(0);
        }
      }

      if (isBmp(bytes)) {
        return parseBmpToRaster(bytes, maxWidth, maxHeight);
      }
    }
  } catch (err) {
    console.warn('[ImageRaster] Failed to decode image via fallback:', err);
  }

  return null;
}
