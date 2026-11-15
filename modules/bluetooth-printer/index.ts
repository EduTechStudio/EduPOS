import { requireNativeModule } from 'expo-modules-core';

export interface PairedDevice {
  name: string;
  address: string;
}

export interface ConnectedDeviceInfo {
  name: string;
  address: string;
}

let nativeModule: any = null;
try {
  nativeModule = requireNativeModule('BluetoothPrinter');
} catch {
  // Graceful fallback for non-native environments or pre-build runtime
  nativeModule = null;
}

export const BluetoothPrinter = {
  isAvailable(): boolean {
    return !!nativeModule;
  },

  async isBluetoothEnabled(): Promise<boolean> {
    if (!nativeModule) return false;
    return await nativeModule.isBluetoothEnabled();
  },

  async getPairedDevices(): Promise<PairedDevice[]> {
    if (!nativeModule) return [];
    return await nativeModule.getPairedDevices();
  },

  async connect(address: string): Promise<boolean> {
    if (!nativeModule) {
      throw new Error('Modul native BluetoothPrinter belum terpasang di build ini.');
    }
    return await nativeModule.connect(address);
  },

  async disconnect(): Promise<boolean> {
    if (!nativeModule) return true;
    return await nativeModule.disconnect();
  },

  async isConnected(): Promise<boolean> {
    if (!nativeModule) return false;
    return await nativeModule.isConnected();
  },

  async getConnectedDevice(): Promise<ConnectedDeviceInfo | null> {
    if (!nativeModule) return null;
    return await nativeModule.getConnectedDevice();
  },

  async writeBase64(base64Data: string): Promise<boolean> {
    if (!nativeModule) {
      throw new Error('Modul native BluetoothPrinter belum terpasang di build ini.');
    }
    return await nativeModule.writeBase64(base64Data);
  },

  async decodeImageToRaster(source: string, maxWidth?: number, maxHeight?: number): Promise<{ width: number; height: number; data: number[] } | null> {
    if (!nativeModule || typeof nativeModule.decodeImageToRaster !== 'function') return null;
    try {
      return await nativeModule.decodeImageToRaster(source, maxWidth || 384, maxHeight || 200);
    } catch {
      return null;
    }
  },
};
