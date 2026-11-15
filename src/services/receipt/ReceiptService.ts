import { TransactionDetail } from '../transaction/TransactionService';
import { ReceiptConfig } from '@/types/receipt';
import { defaultReceiptConfig } from '@/config/defaultReceiptConfig';
import { settingsRepository } from '@/database';
import { RasterBitmap } from '../printer/ImageRaster';

export interface ReceiptData {
  config: ReceiptConfig;
  store: {
    name: string;
    address: string;
    phone: string;
  };
  transaction: {
    transactionNumber: string;
    date: string;
    time: string;
    cashierName: string;
    customerName: string | null;
    subtotal: number;
    discount: number;
    total: number;
  };
  items: Array<{
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  payments: Array<{
    method: string;
    amount: number;
    receivedAmount: number;
    changeAmount: number;
    referenceNumber: string;
  }>;
  logoRaster?: RasterBitmap;
  template?: import('@/types/receiptTemplate').ReceiptTemplate;
  document?: import('@/types/receiptDocument').ReceiptDocument;
  targetWidth?: import('@/types/receiptTemplate').ReceiptWidth;
}

export function createSampleReceiptData(config?: ReceiptConfig): ReceiptData {
  const baseConfig: ReceiptConfig = config || { ...defaultReceiptConfig };
  return {
    config: baseConfig,
    store: {
      name: baseConfig.storeName || 'EduPOS Store',
      address: baseConfig.storeAddress || 'Jl. Pendidikan No. 123, Bandung',
      phone: baseConfig.storePhone || '081234567890',
    },
    transaction: {
      transactionNumber: 'TRX-SAMPLE-001',
      date: '17/10/2026',
      time: '14:30',
      cashierName: 'Kasir EduPOS',
      customerName: 'Budi Santoso',
      subtotal: 75000,
      discount: 5000,
      total: 70000,
    },
    items: [
      {
        name: 'Buku Tulis Sinar Dunia 38 Lembar',
        sku: 'BK-001',
        quantity: 2,
        unitPrice: 15000,
        subtotal: 30000,
      },
      {
        name: 'Pulpen Gel Hitam 0.5mm',
        sku: 'PL-002',
        quantity: 3,
        unitPrice: 5000,
        subtotal: 15000,
      },
      {
        name: 'Penghapus Karet Joyko',
        sku: 'PH-003',
        quantity: 2,
        unitPrice: 12500,
        subtotal: 25000,
      },
    ],
    payments: [
      {
        method: 'Tunai',
        amount: 70000,
        receivedAmount: 100000,
        changeAmount: 30000,
        referenceNumber: '',
      },
    ],
  };
}

export class ReceiptService {
    async getReceiptConfig(): Promise<ReceiptConfig> {
    let baseConfig = { ...defaultReceiptConfig };
    
    // 1. Get receipt config
    const configSetting = await settingsRepository.get('receipt_config');
    if (configSetting && configSetting.value) {
      try {
        const parsed = JSON.parse(configSetting.value) as ReceiptConfig;
        baseConfig = { ...baseConfig, ...parsed };
      } catch (e) {
        // ignore
      }
    }
    
    // 2. Override store identity from store_profile if exists
    const profileSetting = await settingsRepository.get('store_profile');
    if (profileSetting && profileSetting.value) {
      try {
        const profile = JSON.parse(profileSetting.value);
        if (profile.name) baseConfig.storeName = profile.name;
        if (profile.address) baseConfig.storeAddress = profile.address;
        if (profile.phone) baseConfig.storePhone = profile.phone;
        if (profile.logo) baseConfig.logo = profile.logo;
      } catch (e) {
        // ignore
      }
    }
    
    return baseConfig;
  }
  
  async saveReceiptConfig(config: ReceiptConfig): Promise<void> {
     await settingsRepository.set('receipt_config', JSON.stringify(config), 'json');
  }

  async buildReceiptDataFromDetail(detail: TransactionDetail): Promise<ReceiptData> {
    const config = await this.getReceiptConfig();
    
    const d = new Date(detail.transaction.created_at);
    
    const date = d.toLocaleDateString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const time = d.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit'
    });

    const cashierName = detail.cashier?.name || (detail.transaction.cashier_id || 'System');
    const customerName = detail.customer?.name || null;

    return {
      config,
      store: {
        name: config.storeName,
        address: config.storeAddress,
        phone: config.storePhone,
      },
      transaction: {
        transactionNumber: detail.transaction.transaction_number,
        date,
        time,
        cashierName,
        customerName,
        subtotal: detail.transaction.subtotal,
        discount: detail.transaction.discount_amount,
        total: detail.transaction.total_amount,
      },
      items: detail.items.map(i => ({
        name: i.product_name_snapshot,
        sku: i.sku_snapshot || null,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        subtotal: i.subtotal,
      })),
      payments: detail.payments.map(p => ({
        method: p.payment_method,
        amount: p.amount,
        receivedAmount: p.received_amount || 0,
        changeAmount: p.change_amount || 0,
        referenceNumber: p.reference_number || '',
      })),
    };
  }
}

export const receiptService = new ReceiptService();
