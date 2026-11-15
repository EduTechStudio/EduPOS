import { BarcodeScanResult } from './types';
import { barcodeService } from './BarcodeService';

export interface PhysicalScannerConfig {
  /** Maximum interval between keystrokes to be considered part of the same scan burst (in ms). Default 50ms */
  maxInterKeyIntervalMs: number;
  /** Timeout after last keystroke to complete scan if no suffix (in ms). Default 60ms */
  noSuffixTimeoutMs: number;
  /** Minimum length of a valid barcode string. Default 3 */
  minBarcodeLength: number;
  /** Minimum time between duplicate scans of the exact same barcode (in ms). Default 300ms */
  duplicateDebounceMs: number;
}

export const DEFAULT_SCANNER_CONFIG: PhysicalScannerConfig = {
  maxInterKeyIntervalMs: 50,
  noSuffixTimeoutMs: 60,
  minBarcodeLength: 3,
  duplicateDebounceMs: 300,
};

export type BarcodeScanHandler = (result: BarcodeScanResult) => void | Promise<void>;

export class PhysicalScannerService {
  private config: PhysicalScannerConfig;
  private buffer: string = '';
  private keyTimestamps: number[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastScannedBarcode: string | null = null;
  private lastScannedTimestamp: number = 0;
  private isProcessing: boolean = false;
  private scanQueue: Array<() => Promise<void>> = [];

  constructor(config: Partial<PhysicalScannerConfig> = {}) {
    this.config = { ...DEFAULT_SCANNER_CONFIG, ...config };
  }

  /**
   * Resets the current scan buffer and clears pending timers.
   */
  public resetBuffer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.buffer = '';
    this.keyTimestamps = [];
  }

  /**
   * Checks if an input string and its arrival timestamps represent a rapid hardware burst.
   */
  public isHardwareBurst(timestamps: number[], textLength: number): boolean {
    if (timestamps.length < 2 || textLength < this.config.minBarcodeLength) {
      return false;
    }
    // Calculate average inter-character interval
    const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
    const avgInterval = totalDuration / (timestamps.length - 1);

    // Hardware scanners typically average 5-30ms per char; humans average > 100ms
    return avgInterval <= this.config.maxInterKeyIntervalMs;
  }

  /**
   * Validates and normalizes raw barcode candidate.
   * Returns normalized barcode string if valid, or null.
   */
  public validateBarcode(raw: string): string | null {
    if (!raw) return null;
    // Strip trailing carriage return, line feed, or tab
    const cleaned = raw.replace(/[\r\n\t]+/g, '').trim();
    if (cleaned.length < this.config.minBarcodeLength) {
      return null;
    }
    return barcodeService.normalizeBarcode(cleaned);
  }

  /**
   * Checks if this barcode is an accidental immediate duplicate bounce of the exact same scan.
   */
  public isDuplicateBounce(barcode: string, now: number = Date.now()): boolean {
    if (this.lastScannedBarcode === barcode && now - this.lastScannedTimestamp < this.config.duplicateDebounceMs) {
      return true;
    }
    return false;
  }

  /**
   * Records a successfully accepted barcode to debounce immediate hardware bounces.
   */
  public recordScan(barcode: string, now: number = Date.now()): void {
    this.lastScannedBarcode = barcode;
    this.lastScannedTimestamp = now;
  }

  /**
   * Feeds a complete string (e.g. from TextInput onChangeText or onSubmitEditing).
   * Automatically detects if it ends with Enter / Tab or constitutes a complete scan.
   */
  public processRawInput(
    rawText: string,
    onScan: BarcodeScanHandler,
    now: number = Date.now()
  ): boolean {
    const hasSuffix = /[\r\n\t]/.test(rawText);
    const validated = this.validateBarcode(rawText);

    if (!validated) {
      this.resetBuffer();
      return false;
    }

    if (this.isDuplicateBounce(validated, now)) {
      this.resetBuffer();
      return false;
    }

    this.recordScan(validated, now);
    this.resetBuffer();

    const scanResult: BarcodeScanResult = {
      value: validated,
      source: 'hardware',
      timestamp: now,
    };

    this.enqueueScan(async () => {
      await onScan(scanResult);
    });

    return true;
  }

  /**
   * Feeds a single incoming character from hardware key event or text delta.
   * Handles suffix detection (Enter / Tab) and timeout-based completion.
   */
  public feedChar(
    char: string,
    onScan: BarcodeScanHandler,
    now: number = Date.now()
  ): boolean {
    // Check if character is a suffix (Enter or Tab)
    if (char === '\n' || char === '\r' || char === '\t') {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      const validated = this.validateBarcode(this.buffer);
      this.resetBuffer();

      if (validated && !this.isDuplicateBounce(validated, now)) {
        this.recordScan(validated, now);
        const scanResult: BarcodeScanResult = {
          value: validated,
          source: 'hardware',
          timestamp: now,
        };
        this.enqueueScan(async () => {
          await onScan(scanResult);
        });
        return true;
      }
      return false;
    }

    // Normal character handling
    const lastKeyTime = this.keyTimestamps.length > 0 ? this.keyTimestamps[this.keyTimestamps.length - 1] : 0;
    if (lastKeyTime > 0 && now - lastKeyTime > this.config.maxInterKeyIntervalMs * 3) {
      // Too much delay between keys: reset buffer as a previous incomplete/interrupted burst
      this.buffer = '';
      this.keyTimestamps = [];
    }

    this.buffer += char;
    this.keyTimestamps.push(now);

    // Schedule fallback timeout in case scanner has no suffix configured
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      const validated = this.validateBarcode(this.buffer);
      const isBurst = this.isHardwareBurst(this.keyTimestamps, this.buffer.length);
      const finalBuffer = this.buffer;
      this.resetBuffer();

      if (validated && isBurst && !this.isDuplicateBounce(validated, Date.now())) {
        this.recordScan(validated, Date.now());
        const scanResult: BarcodeScanResult = {
          value: validated,
          source: 'hardware',
          timestamp: Date.now(),
        };
        this.enqueueScan(async () => {
          await onScan(scanResult);
        });
      }
    }, this.config.noSuffixTimeoutMs);

    return false;
  }

  /**
   * Enqueues a scan action to guarantee sequential processing without race conditions.
   */
  public enqueueScan(action: () => Promise<void>): void {
    this.scanQueue.push(action);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.scanQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const nextAction = this.scanQueue.shift();

    if (nextAction) {
      try {
        await nextAction();
      } catch (err) {
        console.error('[PhysicalScannerService] Error processing queued scan:', err);
      } finally {
        this.isProcessing = false;
        // Process next item in queue
        if (this.scanQueue.length > 0) {
          this.processQueue();
        }
      }
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Releases all resources, timers, and clears the queue.
   */
  public destroy(): void {
    this.resetBuffer();
    this.scanQueue = [];
    this.isProcessing = false;
    this.lastScannedBarcode = null;
    this.lastScannedTimestamp = 0;
  }
}

export const physicalScannerService = new PhysicalScannerService();
