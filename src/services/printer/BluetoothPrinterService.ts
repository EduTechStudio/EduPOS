import { BasePrinterService } from './PrinterService';
import { PrinterConfig } from '@/types/printer';
import { ReceiptData } from '@/services/receipt/ReceiptService';
import { EscPosEncoder } from './EscPosEncoder';
import { BluetoothPrinter } from 'bluetooth-printer';

/**
 * Thread-safe promise-based queue ensuring sequential execution of print jobs.
 * Prevents concurrent socket writes, buffer collisions, and firmware lockups.
 */
class PrintQueue {
  private queue: Promise<any> = Promise.resolve();

  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue
        .catch(() => {}) // Absorb previous errors to prevent chain stall
        .then(async () => {
          try {
            const result = await task();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
        .catch((fatalError) => {
          // Recover queue so subsequent tasks are never deadlocked
          console.error('[PrintQueue] Queue recovery triggered after fatal error:', fatalError);
          reject(fatalError);
        });
    });
  }
}

export class BluetoothPrinterService extends BasePrinterService {
  private queue = new PrintQueue();

  /**
   * Authoritatively syncs JavaScript connection state with the underlying native RFCOMM socket.
   */
  async syncConnectionStatus(): Promise<boolean> {
    if (BluetoothPrinter.isAvailable()) {
      try {
        const isNativeConnected = await BluetoothPrinter.isConnected();
        this.connected = isNativeConnected;
        return isNativeConnected;
      } catch (err) {
        console.warn('[BluetoothPrinterService] Error querying native isConnected:', err);
        this.connected = false;
        return false;
      }
    }
    return this.connected;
  }

  /**
   * Ensures that a live connection exists before a print operation.
   * If disconnected, automatically attempts reconnection strictly using the saved target printer.
   */
  async ensureConnected(): Promise<boolean> {
    const isLive = await this.syncConnectionStatus();
    if (isLive) {
      return true;
    }

    // Attempt to load saved printer configuration if not already set
    if (!this.config || !this.config.macAddress) {
      try {
        const { settingsRepository } = await import('@/database');
        const setting = await settingsRepository.get('printer_config');
        if (setting?.value) {
          const parsed = JSON.parse(setting.value);
          this.config = { ...this.config, ...parsed };
        }
      } catch (err) {
        console.warn('[BluetoothPrinterService] Failed to load printer settings for auto-reconnect:', err);
      }
    }

    const targetAddress = this.config?.macAddress;
    if (!targetAddress) {
      console.warn('[BluetoothPrinterService] Cannot auto-reconnect: MAC address is not configured.');
      this.connected = false;
      return false;
    }

    console.log(`[BluetoothPrinterService] Socket disconnected. Auto-reconnecting to ${this.config?.printerName || targetAddress}...`);
    try {
      const reconnected = await this.connect(this.config!);
      return reconnected;
    } catch (err: any) {
      console.warn(`[BluetoothPrinterService] Auto-reconnect to ${targetAddress} failed:`, err?.message || err);
      this.connected = false;
      return false;
    }
  }

  async connect(config?: PrinterConfig): Promise<boolean> {
    if (config) {
      this.config = config;
    }

    const targetAddress = this.config?.macAddress;
    if (!targetAddress) {
      throw new Error('Alamat MAC printer Bluetooth belum dipilih. Silakan pilih printer di Pengaturan > Printer & Struk.');
    }

    if (BluetoothPrinter.isAvailable()) {
      const isEnabled = await BluetoothPrinter.isBluetoothEnabled();
      if (!isEnabled) {
        this.connected = false;
        throw new Error('Bluetooth perangkat sedang nonaktif. Harap aktifkan Bluetooth di pengaturan HP/Tablet.');
      }

      try {
        await BluetoothPrinter.connect(targetAddress);
        this.connected = await BluetoothPrinter.isConnected();
        return this.connected;
      } catch (error: any) {
        this.connected = false;
        throw error;
      }
    } else {
      // Development / runtime fallback when native module is not yet compiled
      console.log('[BluetoothPrinterService] (Shim) Connected to:', this.config?.printerName || targetAddress);
      this.connected = true;
      return true;
    }
  }

  async disconnect(): Promise<boolean> {
    if (BluetoothPrinter.isAvailable()) {
      try {
        await BluetoothPrinter.disconnect();
      } catch (err) {
        console.warn('[BluetoothPrinterService] Error during disconnect:', err);
      }
    }
    this.connected = false;
    return true;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async sendBytesToPrinter(bytes: number[]): Promise<boolean> {
    if (BluetoothPrinter.isAvailable()) {
      // Chunked conversion to base64 to avoid call-stack exhaustion on large raster jobs
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64 = btoa(binary);

      try {
        return await BluetoothPrinter.writeBase64(base64);
      } catch (error) {
        // Immediately mark local JS state as disconnected on socket write failure
        this.connected = false;
        throw error;
      }
    } else {
      console.log(`[BluetoothPrinterService] (Shim) Transmitting ${bytes.length} bytes to printer...`);
      return true;
    }
  }

  async printReceipt(receiptData: ReceiptData): Promise<boolean> {
    return this.queue.enqueue(async () => {
      const isReady = await this.ensureConnected();
      if (!isReady || !this.config) {
        throw new Error(`Printer tidak terhubung ke ${this.config?.printerName || 'perangkat'}. Pastikan printer menyala dan dalam jangkauan.`);
      }

      // 1. Resolve active template if document is not already precompiled
      let doc = receiptData.document;
      let activeTemplate: any = receiptData.template || null;

      if (!doc && !activeTemplate) {
        try {
          const { receiptTemplateService } = await import('../receipt/ReceiptTemplateService');
          activeTemplate = await receiptTemplateService.getActiveTemplate();
        } catch (err) {
          console.warn('[BluetoothPrinterService] Could not load active template:', err);
        }
      }

      // 2. Resolve paper width according to strict precedence
      const { compileReceiptDocument, compileLegacyReceiptDocument, resolveReceiptPaperWidth } = await import('../receipt/ReceiptDocumentCompiler');

      const paperWidth = doc
        ? doc.metadata.paperWidth
        : resolveReceiptPaperWidth({
            explicitWidth: receiptData.targetWidth,
            templateWidth: activeTemplate?.paperWidth,
            configWidth: receiptData.config?.receiptWidth,
            printerWidth: this.config?.printerWidth,
          });

      const columns = paperWidth === '58mm' ? 32 : 48;

      // 3. Resolve logo raster if enabled and a logo is configured
      if (!receiptData.logoRaster && receiptData.config?.showLogo !== false && receiptData.config?.logo) {
        try {
          const { convertImageToRaster } = await import('./ImageRaster');
          const maxLogoWidth = columns === 48 ? 384 : 256;
          const raster = await convertImageToRaster(receiptData.config.logo, maxLogoWidth, 200);
          if (raster) {
            receiptData.logoRaster = raster;
          }
        } catch (logoErr) {
          console.warn('[BluetoothPrinterService] Logo conversion skipped:', logoErr);
        }
      }

      // 4. Compile document if not already provided
      if (!doc) {
        if (activeTemplate) {
          doc = compileReceiptDocument(activeTemplate, receiptData, { targetWidth: paperWidth });
        } else {
          doc = compileLegacyReceiptDocument(receiptData, { targetWidth: paperWidth });
        }
      }

      const encoder = new EscPosEncoder(columns);
      const bytes = encoder.encodeDocument(doc, receiptData.logoRaster, false);

      try {
        return await this.sendBytesToPrinter(bytes);
      } catch (initialError: any) {
        console.warn('[BluetoothPrinterService] Initial print write failed. Attempting reconnect retry...', initialError?.message);
        
        // Retry once after reconnecting if socket died mid-session
        const reconnected = await this.ensureConnected();
        if (reconnected) {
          return await this.sendBytesToPrinter(bytes);
        }
        throw initialError;
      }
    });
  }

  async testPrint(): Promise<boolean> {
    return this.queue.enqueue(async () => {
      const isReady = await this.ensureConnected();
      if (!isReady || !this.config) {
        throw new Error(`Printer tidak terhubung ke ${this.config?.printerName || 'perangkat'}. Pastikan printer menyala dan dalam jangkauan.`);
      }

      const columns = this.config.printerWidth === '80mm' ? 48 : 32;
      const encoder = new EscPosEncoder(columns);
      const bytes = encoder.encodeTest(false);

      try {
        return await this.sendBytesToPrinter(bytes);
      } catch (initialError: any) {
        console.warn('[BluetoothPrinterService] Initial test print write failed. Attempting reconnect retry...', initialError?.message);
        
        const reconnected = await this.ensureConnected();
        if (reconnected) {
          return await this.sendBytesToPrinter(bytes);
        }
        throw initialError;
      }
    });
  }
}
