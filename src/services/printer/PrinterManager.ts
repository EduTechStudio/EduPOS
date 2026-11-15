import { PrinterConfig } from '@/types/printer';
import { BasePrinterService } from './PrinterService';
import { MockPrinterService } from './MockPrinter';
import { BluetoothPrinterService } from './BluetoothPrinterService';
import { defaultPrinterConfig } from '@/config/defaultPrinterConfig';

export class PrinterManager {
  private static instance: BasePrinterService;
  private static currentConfig: PrinterConfig | null = null;

  public static getInstance(config?: PrinterConfig): BasePrinterService {
    const effectiveConfig = config || this.currentConfig || defaultPrinterConfig;
    if (!this.instance) {
      if (effectiveConfig.connectionType === 'bluetooth') {
        this.instance = new BluetoothPrinterService();
      } else {
        this.instance = new MockPrinterService();
      }
      this.currentConfig = effectiveConfig;
      this.instance.setConfig?.(effectiveConfig);
    } else if (config && config.connectionType !== this.currentConfig?.connectionType) {
      // Switch printer implementation if connection type changed
      this.instance.disconnect();
      if (config.connectionType === 'bluetooth') {
        this.instance = new BluetoothPrinterService();
      } else {
        this.instance = new MockPrinterService();
      }
      this.currentConfig = config;
      this.instance.setConfig?.(config);
    } else if (config) {
      this.currentConfig = config;
      this.instance.setConfig?.(config);
    }
    return this.instance;
  }

  public static async getSavedConfig(): Promise<PrinterConfig> {
    try {
      const { settingsRepository } = await import('@/database');
      const setting = await settingsRepository.get('printer_config');
      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        const config: PrinterConfig = { ...defaultPrinterConfig, ...parsed };
        this.currentConfig = config;
        return config;
      }
    } catch (_) {}
    return this.currentConfig || defaultPrinterConfig;
  }

  public static async getInitializedInstance(): Promise<BasePrinterService> {
    const effectiveConfig = await this.getSavedConfig();
    const instance = this.getInstance(effectiveConfig);
    if (instance instanceof BluetoothPrinterService) {
      instance.setConfig(effectiveConfig);
      await instance.syncConnectionStatus();
    }
    return instance;
  }
}
