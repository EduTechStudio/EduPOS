import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { getDatabase, withTransaction } from '@/database/database';
import { authorizationService } from '@/services/auth/AuthorizationService';
import { verifyPin, isLegacyHash, isModernHash } from '@/utils/crypto';
import { UserEntity } from '@/database/types';
import { UserRepository } from '@/database/repositories/UserRepository';

export interface BackupMetadata {
  formatVersion: number;
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  archiveType?: 'full' | 'transaction_archive';
  periodStart?: string;
  periodEnd?: string;
  counts: {
    categories: number;
    products: number;
    customers: number;
    roles: number;
    users: number;
    permissions: number;
    rolePermissions: number;
    userPermissions?: number;
    draftSales?: number;
    draftSaleItems?: number;
    transactions: number;
    transactionItems: number;
    payments: number;
    stockMovements: number;
    expenses: number;
    settings: number;
    productPriceTiers?: number;
  };
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    categories: any[];
    products: any[];
    customers: any[];
    roles: any[];
    users: any[];
    permissions: any[];
    rolePermissions: any[];
    userPermissions?: any[];
    draftSales?: any[];
    draftSaleItems?: any[];
    transactions: any[];
    transactionItems: any[];
    payments: any[];
    stockMovements: any[];
    expenses: any[];
    settings: any[];
    productPriceTiers?: any[];
  };
}

export interface RestoreOptions {
  confirmationPin: string;
}

export interface TableSchemaDefinition {
  tableName: string;
  columns: string[];
  primaryKey: string | string[];
  requiredFields: string[];
  integerFields?: string[];
  decimalFields?: string[];
  enums?: Record<string, readonly string[]>;
}

export const TABLE_SCHEMAS: Record<string, TableSchemaDefinition> = {
  permissions: {
    tableName: 'permissions',
    columns: ['id', 'key', 'name', 'description', 'created_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'key', 'name', 'created_at'],
  },
  categories: {
    tableName: 'categories',
    columns: ['id', 'name', 'description', 'sort_order', 'is_active', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'name', 'created_at', 'updated_at'],
    integerFields: ['sort_order', 'is_active'],
  },
  roles: {
    tableName: 'roles',
    columns: ['id', 'name', 'description', 'is_system', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'name', 'created_at', 'updated_at'],
    integerFields: ['is_system'],
  },
  customers: {
    tableName: 'customers',
    columns: ['id', 'name', 'phone', 'email', 'address', 'notes', 'is_active', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'name', 'created_at', 'updated_at'],
    integerFields: ['is_active'],
  },
  users: {
    tableName: 'users',
    columns: ['id', 'name', 'username', 'pin_hash', 'role_id', 'is_active', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'name', 'username', 'pin_hash', 'role_id', 'created_at', 'updated_at'],
    integerFields: ['is_active'],
  },
  role_permissions: {
    tableName: 'role_permissions',
    columns: ['role_id', 'permission_id'],
    primaryKey: ['role_id', 'permission_id'],
    requiredFields: ['role_id', 'permission_id'],
  },
  user_permissions: {
    tableName: 'user_permissions',
    columns: ['id', 'user_id', 'permission_id', 'effect', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'user_id', 'permission_id', 'effect', 'created_at', 'updated_at'],
    enums: { effect: ['GRANT', 'DENY'] },
  },
  products: {
    tableName: 'products',
    columns: ['id', 'category_id', 'sku', 'barcode', 'name', 'description', 'purchase_price', 'selling_price', 'stock_tracking', 'current_stock', 'minimum_stock', 'unit', 'image_uri', 'is_active', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'sku', 'name', 'created_at', 'updated_at'],
    integerFields: ['purchase_price', 'selling_price', 'stock_tracking', 'is_active'],
    decimalFields: ['current_stock', 'minimum_stock'],
  },
  expenses: {
    tableName: 'expenses',
    columns: ['id', 'category', 'description', 'amount', 'expense_date', 'notes', 'created_by', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'category', 'description', 'amount', 'expense_date', 'created_at', 'updated_at'],
    integerFields: ['amount'],
  },
  settings: {
    tableName: 'settings',
    columns: ['key', 'value', 'value_type', 'created_at', 'updated_at'],
    primaryKey: 'key',
    requiredFields: ['key', 'value', 'value_type', 'created_at', 'updated_at'],
    enums: { value_type: ['string', 'number', 'boolean', 'json'] },
  },
  draft_sales: {
    tableName: 'draft_sales',
    columns: ['id', 'draft_number', 'status', 'customer_id', 'subtotal', 'discount_amount', 'total_amount', 'created_by', 'created_at', 'updated_at', 'cancelled_by', 'cancelled_at', 'cancellation_reason', 'discount_type', 'discount_value'],
    primaryKey: 'id',
    requiredFields: ['id', 'draft_number', 'status', 'subtotal', 'discount_amount', 'total_amount', 'created_by', 'created_at', 'updated_at'],
    integerFields: ['subtotal', 'discount_amount', 'total_amount', 'discount_value'],
  },
  draft_sale_items: {
    tableName: 'draft_sale_items',
    columns: ['id', 'draft_sale_id', 'product_id', 'product_name_snapshot', 'sku_snapshot', 'quantity', 'unit_price', 'discount_amount', 'subtotal'],
    primaryKey: 'id',
    requiredFields: ['id', 'draft_sale_id', 'product_name_snapshot', 'quantity', 'unit_price', 'discount_amount', 'subtotal'],
    integerFields: ['unit_price', 'discount_amount', 'subtotal'],
    decimalFields: ['quantity'],
  },
  transactions: {
    tableName: 'transactions',
    columns: ['id', 'transaction_number', 'customer_id', 'cashier_id', 'status', 'subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'payment_status', 'notes', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'transaction_number', 'status', 'subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'payment_status', 'created_at', 'updated_at'],
    integerFields: ['subtotal', 'discount_amount', 'tax_amount', 'total_amount'],
    enums: { status: ['COMPLETED', 'CANCELLED', 'REFUNDED'] },
  },
  transaction_items: {
    tableName: 'transaction_items',
    columns: ['id', 'transaction_id', 'product_id', 'product_name_snapshot', 'sku_snapshot', 'quantity', 'unit_price', 'discount_amount', 'subtotal', 'created_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'transaction_id', 'product_name_snapshot', 'quantity', 'unit_price', 'discount_amount', 'subtotal', 'created_at'],
    integerFields: ['unit_price', 'discount_amount', 'subtotal'],
    decimalFields: ['quantity'],
  },
  payments: {
    tableName: 'payments',
    columns: ['id', 'transaction_id', 'payment_method', 'amount', 'received_amount', 'change_amount', 'reference_number', 'status', 'paid_at', 'notes', 'provider', 'gateway_payment_id', 'expires_at', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'transaction_id', 'payment_method', 'amount', 'received_amount', 'change_amount', 'status', 'created_at', 'updated_at'],
    integerFields: ['amount', 'received_amount', 'change_amount'],
  },
  stock_movements: {
    tableName: 'stock_movements',
    columns: ['id', 'product_id', 'movement_type', 'quantity', 'reference_type', 'reference_id', 'notes', 'created_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'product_id', 'movement_type', 'quantity', 'created_at'],
    decimalFields: ['quantity'],
    enums: { movement_type: ['PURCHASE', 'SALE', 'ADJUSTMENT', 'RETURN', 'DAMAGE'] },
  },
  product_price_tiers: {
    tableName: 'product_price_tiers',
    columns: ['id', 'product_id', 'min_quantity', 'unit_price', 'created_at', 'updated_at'],
    primaryKey: 'id',
    requiredFields: ['id', 'product_id', 'min_quantity', 'unit_price', 'created_at', 'updated_at'],
    integerFields: ['unit_price'],
    decimalFields: ['min_quantity'],
  },
};

export const BACKUP_TABLE_MAPPING: Record<string, string> = {
  categories: 'categories',
  products: 'products',
  customers: 'customers',
  roles: 'roles',
  users: 'users',
  permissions: 'permissions',
  rolePermissions: 'role_permissions',
  userPermissions: 'user_permissions',
  draftSales: 'draft_sales',
  draftSaleItems: 'draft_sale_items',
  transactions: 'transactions',
  transactionItems: 'transaction_items',
  payments: 'payments',
  stockMovements: 'stock_movements',
  expenses: 'expenses',
  settings: 'settings',
  productPriceTiers: 'product_price_tiers',
};

export const TABLE_DEFAULTS: Record<string, Record<string, any>> = {
  categories: { sort_order: 0, is_active: 1 },
  products: { purchase_price: 0, selling_price: 0, stock_tracking: 1, current_stock: 0, minimum_stock: 0, unit: 'pcs', is_active: 1 },
  customers: { is_active: 1 },
  roles: { is_system: 0 },
  users: { is_active: 1 },
  transactions: { subtotal: 0, discount_amount: 0, tax_amount: 0, total_amount: 0 },
  transaction_items: { quantity: 1, unit_price: 0, discount_amount: 0, subtotal: 0 },
  payments: { amount: 0, received_amount: 0, change_amount: 0 },
  draft_sales: { subtotal: 0, discount_amount: 0, total_amount: 0, discount_type: 'FIXED', discount_value: 0 },
  draft_sale_items: { quantity: 1, unit_price: 0, discount_amount: 0, subtotal: 0 },
  expenses: { amount: 0 },
  product_price_tiers: { unit_price: 0 },
};

export interface IBackupService {
  createBackup(): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }>;
  createSafetySnapshot(): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }>;
  createTransactionArchive(startDate: string, endDate: string): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }>;
  removeArchivedTransactions(startDate: string, endDate: string): Promise<{ success: boolean; count?: number; message?: string }>;
  createSafetySnapshot(): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }>;
  createTransactionArchive(startDate: string, endDate: string): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }>;
  shareBackup(filePath: string): Promise<boolean>;
  saveBackupToDevice(sourceFilePath?: string): Promise<{ success: boolean; cancelled?: boolean; filePath?: string; fileName?: string; message?: string }>;
  pickBackupFile(): Promise<{ success: boolean; uri?: string; name?: string; message?: string }>;
  validateBackup(uri: string): Promise<{ success: boolean; backup?: BackupData; message?: string }>;
  restoreBackup(backup: BackupData, options: RestoreOptions): Promise<{ success: boolean; message?: string }>;
  restoreTransactionArchive(archive: BackupData): Promise<{ success: boolean; message?: string }>;
}

export class BackupService implements IBackupService {
  private readonly CURRENT_FORMAT_VERSION = 2;
  private readonly SUPPORTED_FORMAT_VERSIONS = [1, 2];
  private readonly SCHEMA_VERSION = 8;
  private readonly APP_VERSION = '1.0.0';
  private readonly MAX_SAFETY_SNAPSHOTS = 5;
  private userRepo = new UserRepository();

  /**
   * Normalizes arbitrary date strings (YYYY-MM-DD, space-separated, or ISO 8601)
   * into consistent ISO 8601 boundary timestamps and YYYY-MM-DD date strings.
   */
  private normalizeDateBounds(startDate: string, endDate: string): {
    isoStart: string;
    isoEnd: string;
    dateStart: string;
    dateEnd: string;
  } {
    const s = startDate.trim();
    const e = endDate.trim();
    const dateStart = s.substring(0, 10);
    const dateEnd = e.substring(0, 10);
    const isoStart = s.includes('T') ? s : `${dateStart}T00:00:00.000Z`;
    const isoEnd = e.includes('T') ? e : `${dateEnd}T23:59:59.999Z`;
    return { isoStart, isoEnd, dateStart, dateEnd };
  }

  async createTransactionArchive(startDate: string, endDate: string): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }> {
    authorizationService.requirePermission('settings.manage');
    try {
      const db = await getDatabase();
      const { isoStart, isoEnd, dateStart, dateEnd } = this.normalizeDateBounds(startDate, endDate);

      const transactions = await db.getAllAsync(
        `SELECT * FROM transactions 
         WHERE (created_at >= ? AND created_at <= ?) OR (date(created_at) >= date(?) AND date(created_at) <= date(?))
         ORDER BY created_at ASC;`,
        [isoStart, isoEnd, dateStart, dateEnd]
      );
      
      if (transactions.length === 0) {
        return { success: false, message: 'Tidak ada transaksi pada periode ini.' };
      }

      const txIdList = transactions.map((t: any) => t.id);
      let transactionItems: any[] = [];
      let payments: any[] = [];
      let stockMovements: any[] = [];

      for (let i = 0; i < txIdList.length; i += 200) {
        const chunk = txIdList.slice(i, i + 200);
        const placeholders = chunk.map(() => '?').join(',');
        const tiChunk = await db.getAllAsync(`SELECT * FROM transaction_items WHERE transaction_id IN (${placeholders});`, chunk);
        const payChunk = await db.getAllAsync(`SELECT * FROM payments WHERE transaction_id IN (${placeholders});`, chunk);
        const smChunk = await db.getAllAsync(`SELECT * FROM stock_movements WHERE reference_id IN (${placeholders}) AND reference_type IN ('TRANSACTION', 'SALE');`, chunk);
        transactionItems.push(...tiChunk);
        payments.push(...payChunk);
        stockMovements.push(...smChunk);
      }
      
      const metadata: BackupMetadata = {
        formatVersion: this.CURRENT_FORMAT_VERSION,
        appVersion: this.APP_VERSION,
        schemaVersion: this.SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        archiveType: 'transaction_archive',
        periodStart: dateStart,
        periodEnd: dateEnd,
        counts: {
          categories: 0, products: 0, customers: 0, roles: 0, users: 0,
          permissions: 0, rolePermissions: 0, userPermissions: 0,
          draftSales: 0, draftSaleItems: 0,
          expenses: 0, settings: 0,
          transactions: transactions.length,
          transactionItems: transactionItems.length,
          payments: payments.length,
          stockMovements: stockMovements.length,
        },
      };

      const backupData: BackupData = {
        metadata,
        data: {
          categories: [], products: [], customers: [], roles: [], users: [],
          permissions: [], rolePermissions: [], userPermissions: [],
          draftSales: [], draftSaleItems: [],
          expenses: [], settings: [],
          transactions,
          transactionItems: transactionItems as any[],
          payments,
          stockMovements: stockMovements as any[],
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const salt = Math.random().toString(36).substring(2, 6);
      const fileName = `archive_tx_${dateStart}_${dateEnd}_${Date.now()}_${salt}.storebackup`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
      
      const info = await FileSystem.getInfoAsync(fileUri);
      if (!info.exists || !('size' in info) || info.size === 0) {
        throw new Error('Gagal menulis file archive transaksi atau ukuran file 0 byte.');
      }

      return { success: true, filePath: fileUri, metadata };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async removeArchivedTransactions(startDate: string, endDate: string): Promise<{ success: boolean; count?: number; message?: string }> {
    authorizationService.requirePermission('settings.manage');
    try {
      const db = await getDatabase();
      const { isoStart, isoEnd, dateStart, dateEnd } = this.normalizeDateBounds(startDate, endDate);

      const transactions = await db.getAllAsync(
        `SELECT id FROM transactions 
         WHERE (created_at >= ? AND created_at <= ?) OR (date(created_at) >= date(?) AND date(created_at) <= date(?));`,
        [isoStart, isoEnd, dateStart, dateEnd]
      );

      if (transactions.length === 0) {
        return { success: false, message: 'Tidak ada transaksi yang cocok untuk dihapus pada periode ini.' };
      }

      // Pre-deletion safety snapshot (safety measure before destructive batch removal)
      const safetySnapshot = await this.createSafetySnapshot();
      if (!safetySnapshot.success) {
        return {
          success: false,
          message: `Gagal membuat safety snapshot sebelum menghapus transaksi: ${safetySnapshot.message}. Operasi dibatalkan demi keamanan data aktif.`,
        };
      }

      const txIdList = transactions.map((t: any) => t.id);

      await withTransaction(async (dbClient) => {
        for (let i = 0; i < txIdList.length; i += 200) {
          const chunk = txIdList.slice(i, i + 200);
          const placeholders = chunk.map(() => '?').join(',');

          // Delete in reverse foreign key order
          await dbClient.runAsync(
            `DELETE FROM stock_movements WHERE reference_type IN ('TRANSACTION', 'SALE') AND reference_id IN (${placeholders});`,
            chunk
          );
          await dbClient.runAsync(`DELETE FROM payments WHERE transaction_id IN (${placeholders});`, chunk);
          await dbClient.runAsync(`DELETE FROM transaction_items WHERE transaction_id IN (${placeholders});`, chunk);
          await dbClient.runAsync(`DELETE FROM transactions WHERE id IN (${placeholders});`, chunk);
        }

        const fkViolations = await dbClient.getAllAsync<any>('PRAGMA foreign_key_check;');
        if (fkViolations && fkViolations.length > 0) {
          throw new Error(`Integritas foreign key gagal saat menghapus transaksi: ${fkViolations.length} pelanggaran relasi.`);
        }
      });

      return {
        success: true,
        count: transactions.length,
        message: `${transactions.length} transaksi berhasil dihapus dari perangkat.`,
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Public entry point for creating full portable database backup.
   * Requires 'settings.manage' authorization.
   * Portable backups are NOT subject to automatic safety snapshot retention pruning.
   */
  async createBackup(): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }> {
    authorizationService.requirePermission('settings.manage');
    return this.createBackupInternal(false);
  }

  /**
   * Internal automatic safety snapshot creation.
   * Used prior to destructive restore and archive import.
   * Subject to rolling retention policy (keeps latest 5 valid safety snapshots).
   */
  async createSafetySnapshot(): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }> {
    return this.createBackupInternal(true);
  }

  /**
   * Prunes old internal safety snapshots keeping only the latest MAX_SAFETY_SNAPSHOTS (Fix F-03).
   * - Only matches files with 'safety-snapshot-' prefix.
   * - Never touches user portable backups ('store-pos-backup-*.json') or transaction archives ('archive_tx_*.storebackup').
   * - Never deletes the currently created safety snapshot.
   * - Safely ignores deletion errors without failing the snapshot operation.
   */
  private async pruneSafetySnapshots(currentSnapshotPath: string): Promise<void> {
    try {
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) return;

      const files = await FileSystem.readDirectoryAsync(backupDir);
      const safetyFiles: { name: string; path: string; timestamp: number }[] = [];

      for (const file of files) {
        if (!file.startsWith('safety-snapshot-') || !file.endsWith('.json')) {
          continue;
        }
        // Path traversal guard
        if (file.includes('..') || file.includes('/') || file.includes('\\')) {
          continue;
        }

        const filePath = `${backupDir}${file}`;
        let fileTime = 0;
        try {
          const info = await FileSystem.getInfoAsync(filePath);
          if (info.exists && 'modificationTime' in info && typeof info.modificationTime === 'number') {
            fileTime = info.modificationTime;
          }
        } catch {
          fileTime = 0;
        }
        safetyFiles.push({ name: file, path: filePath, timestamp: fileTime });
      }

      if (safetyFiles.length <= this.MAX_SAFETY_SNAPSHOTS) {
        return;
      }

      // Sort newest to oldest: highest timestamp first, then lexicographically descending by filename
      safetyFiles.sort((a, b) => {
        if (b.timestamp !== a.timestamp) {
          return b.timestamp - a.timestamp;
        }
        return b.name.localeCompare(a.name);
      });

      // Keep top MAX_SAFETY_SNAPSHOTS, prune older
      const filesToPrune = safetyFiles.slice(this.MAX_SAFETY_SNAPSHOTS);
      for (const item of filesToPrune) {
        if (item.path === currentSnapshotPath) {
          continue;
        }
        try {
          await FileSystem.deleteAsync(item.path, { idempotent: true });
          console.log(`[BackupService] Pruned old safety snapshot: ${item.name}`);
        } catch (delErr: any) {
          console.warn(`[BackupService] Failed to prune safety snapshot ${item.name}:`, delErr.message);
        }
      }
    } catch (pruneErr: any) {
      console.warn('[BackupService] pruneSafetySnapshots warning:', pruneErr.message);
    }
  }

  /**
   * Internal backup implementation without public permission check.
   * Used for safety backups prior to destructive restore and by createBackup().
   */
  private async createBackupInternal(isSafetySnapshot = false): Promise<{ success: boolean; filePath?: string; metadata?: BackupMetadata; message?: string }> {
    try {
      const db = await getDatabase();

      // Retrieve all persistent application tables including user_permissions and draft sales
      const categories = await db.getAllAsync('SELECT * FROM categories;');
      const products = await db.getAllAsync('SELECT * FROM products;');
      const customers = await db.getAllAsync('SELECT * FROM customers;');
      const roles = await db.getAllAsync('SELECT * FROM roles;');
      const users = await db.getAllAsync('SELECT * FROM users;');
      const permissions = await db.getAllAsync('SELECT * FROM permissions;');
      const rolePermissions = await db.getAllAsync('SELECT * FROM role_permissions;');
      const userPermissions = await db.getAllAsync('SELECT * FROM user_permissions;');
      const draftSales = await db.getAllAsync('SELECT * FROM draft_sales;');
      const draftSaleItems = await db.getAllAsync('SELECT * FROM draft_sale_items;');
      const transactions = await db.getAllAsync('SELECT * FROM transactions;');
      const transactionItems = await db.getAllAsync('SELECT * FROM transaction_items;');
      const payments = await db.getAllAsync('SELECT * FROM payments;');
      const stockMovements = await db.getAllAsync('SELECT * FROM stock_movements;');
      const expenses = await db.getAllAsync('SELECT * FROM expenses;');
      const settings = await db.getAllAsync('SELECT * FROM settings;');
      let productPriceTiers: any[] = [];
      try {
        productPriceTiers = (await db.getAllAsync('SELECT * FROM product_price_tiers ORDER BY product_id, min_quantity ASC;')) || [];
      } catch {
        productPriceTiers = [];
      }

      const metadata: BackupMetadata = {
        formatVersion: this.CURRENT_FORMAT_VERSION,
        appVersion: this.APP_VERSION,
        schemaVersion: this.SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        archiveType: 'full',
        counts: {
          categories: categories.length,
          products: products.length,
          customers: customers.length,
          roles: roles.length,
          users: users.length,
          permissions: permissions.length,
          rolePermissions: rolePermissions.length,
          userPermissions: userPermissions.length,
          draftSales: draftSales.length,
          draftSaleItems: draftSaleItems.length,
          transactions: transactions.length,
          transactionItems: transactionItems.length,
          payments: payments.length,
          stockMovements: stockMovements.length,
          expenses: expenses.length,
          settings: settings.length,
          productPriceTiers: productPriceTiers.length,
        },
      };

      const backupData: BackupData = {
        metadata,
        data: {
          categories,
          products,
          customers,
          roles,
          users,
          permissions,
          rolePermissions: rolePermissions as any[],
          userPermissions: userPermissions as any[],
          draftSales: draftSales as any[],
          draftSaleItems: draftSaleItems as any[],
          transactions,
          transactionItems: transactionItems as any[],
          payments,
          stockMovements: stockMovements as any[],
          expenses,
          settings,
          productPriceTiers: productPriceTiers as any[],
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      
      // Store in persistent app-accessible document directory (NOT ephemeral cacheDirectory)
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
      }

      const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
      const randomSalt = Math.random().toString(36).substring(2, 8);
      const prefix = isSafetySnapshot ? 'safety-snapshot' : 'store-pos-backup';
      const filename = `${prefix}-${safeDate}-${randomSalt}.json`;
      const filePath = `${backupDir}${filename}`;

      await FileSystem.writeAsStringAsync(filePath, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists || !('size' in fileInfo) || fileInfo.size === 0) {
        throw new Error('File backup gagal disimpan atau berukuran 0 byte.');
      }

      // If internal safety snapshot, prune older snapshots beyond MAX_SAFETY_SNAPSHOTS
      if (isSafetySnapshot) {
        await this.pruneSafetySnapshots(filePath);
      }

      return {
        success: true,
        filePath,
        metadata,
        message: 'Backup created successfully',
      };
    } catch (error: any) {
      console.error('[BackupService] createBackup error:', error);
      return {
        success: false,
        message: error.message || 'Gagal membuat backup',
      };
    }
  }

  async shareBackup(filePath: string): Promise<boolean> {
    authorizationService.requirePermission('settings.manage');
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return false;
      }
      const isStoreBackup = filePath.endsWith('.storebackup');
      await Sharing.shareAsync(filePath, {
        mimeType: isStoreBackup ? 'application/octet-stream' : 'application/json',
        dialogTitle: 'Simpan atau Bagikan Backup Store POS',
      });
      return true;
    } catch (error) {
      console.error('[BackupService] shareBackup error:', error);
      return false;
    }
  }

  async saveBackupToDevice(sourceFilePath?: string): Promise<{
    success: boolean;
    cancelled?: boolean;
    filePath?: string;
    fileName?: string;
    message?: string;
  }> {
    authorizationService.requirePermission('settings.manage');
    try {
      let localPath = sourceFilePath;

      // If no local file path was provided, generate backup first in app persistent storage
      if (!localPath) {
        const backupResult = await this.createBackupInternal();
        if (!backupResult.success || !backupResult.filePath) {
          return {
            success: false,
            message: backupResult.message || 'Gagal membuat file backup.',
          };
        }
        localPath = backupResult.filePath;
      }

      // Read content from local persistent file
      const content = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Derive base filename and extension
      const pathParts = localPath.split('/');
      const rawFileName = pathParts[pathParts.length - 1] || `store-pos-backup-${Date.now()}.json`;
      const isStoreBackup = rawFileName.endsWith('.storebackup');
      const fileNameWithoutExt = rawFileName.replace(/\.(json|storebackup)$/i, '');
      const extension = isStoreBackup ? 'storebackup' : 'json';
      const mimeType = isStoreBackup ? 'application/octet-stream' : 'application/json';

      // Non-Android platforms (e.g. iOS) use the native share sheet which includes "Save to Files"
      if (Platform.OS !== 'android') {
        const shared = await this.shareBackup(localPath);
        if (shared) {
          return {
            success: true,
            fileName: rawFileName,
            filePath: localPath,
            message: 'Dialog penyimpanan file berhasil dibuka.',
          };
        }
        return {
          success: false,
          message: 'Penyimpanan langsung ke folder hanya didukung di Android. Gunakan opsi Bagikan Backup.',
        };
      }

      // Android: Storage Access Framework (SAF)
      const { StorageAccessFramework } = FileSystem;
      if (!StorageAccessFramework) {
        return {
          success: false,
          message: 'Storage Access Framework tidak tersedia di perangkat ini.',
        };
      }

      let initialUri: string | null = null;
      try {
        initialUri = StorageAccessFramework.getUriForDirectoryInRoot('Download');
      } catch {
        initialUri = null;
      }

      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
      if (!permissions.granted) {
        return {
          success: false,
          cancelled: true,
          message: 'Pemilihan folder dibatalkan oleh pengguna.',
        };
      }

      const targetUri = await StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        fileNameWithoutExt,
        mimeType
      );

      await FileSystem.writeAsStringAsync(targetUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const fileInfo = await FileSystem.getInfoAsync(targetUri);
      if (fileInfo.exists && 'size' in fileInfo && fileInfo.size === 0) {
        throw new Error('File berhasil dibuat tetapi ukuran data 0 byte.');
      }

      return {
        success: true,
        filePath: targetUri,
        fileName: `${fileNameWithoutExt}.${extension}`,
        message: 'File backup berhasil disimpan ke folder pilihan Anda.',
      };
    } catch (error: any) {
      console.error('[BackupService] saveBackupToDevice error:', error);
      return {
        success: false,
        message: error.message || 'Gagal menyimpan file backup ke perangkat.',
      };
    }
  }

  async pickBackupFile(): Promise<{ success: boolean; uri?: string; name?: string; message?: string }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('[BackupService] Document picker cancelled by user');
        return { success: false, message: 'Dibatalkan' };
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uriScheme = asset.uri ? asset.uri.split(':')[0] : 'unknown';
        console.log(`[BackupService] Document picked: name="${asset.name}", size=${asset.size}, scheme="${uriScheme}", uri="${asset.uri.substring(0, 80)}..."`);
        return {
          success: true,
          uri: asset.uri,
          name: asset.name,
        };
      }

      console.warn('[BackupService] Document picker returned no assets and not canceled');
      return { success: false, message: 'File tidak ditemukan' };
    } catch (error: any) {
      console.error('[BackupService] pickBackupFile error:', error);
      return { success: false, message: 'Gagal memilih file backup' };
    }
  }

  /**
   * Robust multi-tier file reader that reads backup JSON from local/remote/SAF/cache URIs,
   * handling Expo Go Android scoping limitations and varied content schemes.
   */
  private async readBackupFileContent(uri: string): Promise<string> {
    const uriScheme = uri.split(':')[0] || 'unknown';
    console.log(`[BackupService] readBackupFileContent: reading from scheme="${uriScheme}", URI="${uri.substring(0, 80)}..."`);

    let lastError: Error | null = null;

    // Strategy 1: Standard FileSystem.readAsStringAsync
    try {
      const content = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (content && content.trim().length > 0) {
        console.log(`[BackupService] Strategy 1 (readAsStringAsync) succeeded (${content.length} chars).`);
        return content;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[BackupService] Strategy 1 (readAsStringAsync) failed: ${err.message}. Trying fallbacks...`);
    }

    // Strategy 2: React Native fetch()
    // React Native Android networking layer uses native ContentResolver / FileInputStream directly,
    // which bypasses Expo's Experience scoping restriction in Expo Go on Android.
    try {
      console.log('[BackupService] Attempting Strategy 2: React Native fetch()...');
      const response = await fetch(uri);
      if (response.ok || response.status === 0 || response.status === 200) {
        const content = await response.text();
        if (content && content.trim().length > 0) {
          console.log(`[BackupService] Strategy 2 (fetch) succeeded (${content.length} chars).`);
          return content;
        }
      }
      console.warn(`[BackupService] Strategy 2 fetch returned status ${response.status}`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[BackupService] Strategy 2 (fetch) failed: ${err.message}. Trying next fallback...`);
    }

    // Strategy 3: FileSystem.copyAsync to an app-scoped documentDirectory staging file
    // Effective if URI is content:// or external provider that copyAsync can stream into app space
    const stagingPath = `${FileSystem.documentDirectory}restore_staging_${Date.now()}.json`;
    try {
      console.log('[BackupService] Attempting Strategy 3: FileSystem.copyAsync staging...');
      await FileSystem.copyAsync({ from: uri, to: stagingPath });
      const content = await FileSystem.readAsStringAsync(stagingPath, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log(`[BackupService] Strategy 3 (copyAsync staging) succeeded (${content.length} chars).`);
      await FileSystem.deleteAsync(stagingPath, { idempotent: true }).catch(() => {});
      return content;
    } catch (err: any) {
      lastError = err;
      console.warn(`[BackupService] Strategy 3 (copyAsync) failed: ${err.message}`);
      await FileSystem.deleteAsync(stagingPath, { idempotent: true }).catch(() => {});
    }

    // Strategy 4: Android Storage Access Framework (SAF) for content:// URIs
    if (Platform.OS === 'android' && uri.startsWith('content://')) {
      try {
        console.log('[BackupService] Attempting Strategy 4: StorageAccessFramework.readAsStringAsync...');
        const { StorageAccessFramework } = FileSystem;
        if (StorageAccessFramework) {
          const content = await StorageAccessFramework.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          if (content && content.trim().length > 0) {
            console.log(`[BackupService] Strategy 4 (SAF) succeeded (${content.length} chars).`);
            return content;
          }
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[BackupService] Strategy 4 (SAF) failed: ${err.message}`);
      }
    }

    const detailMsg = lastError ? `: ${lastError.message}` : '';
    throw new Error(`File backup tidak dapat dibaca dari perangkat${detailMsg}. Pastikan izin akses file diberikan.`);
  }

  async validateBackup(uri: string): Promise<{ success: boolean; backup?: BackupData; message?: string }> {
    try {
      console.log(`[BackupService] validateBackup started for URI: ${uri.substring(0, 80)}...`);

      // Read file content using multi-tier robust reader
      let content: string;
      try {
        content = await this.readBackupFileContent(uri);
      } catch (readErr: any) {
        console.error('[BackupService] validateBackup file read failure:', readErr.message);
        return {
          success: false,
          message: `Gagal membaca file backup: ${readErr.message || 'File tidak dapat diakses'}.`,
        };
      }

      if (!content || content.trim().length === 0) {
        return { success: false, message: 'File backup kosong (0 byte).' };
      }

      // JSON syntax validation
      let backupData: any;
      try {
        backupData = JSON.parse(content);
      } catch (e: any) {
        console.error('[BackupService] validateBackup JSON parse error:', e.message);
        return { success: false, message: 'Format file tidak valid (bukan JSON atau isi file rusak).' };
      }

      if (!backupData || typeof backupData !== 'object' || !backupData.metadata || !backupData.data) {
        return { success: false, message: 'Struktur backup tidak valid (metadata atau data hilang).' };
      }

      const formatVer = backupData.metadata.formatVersion;
      if (typeof formatVer !== 'number' || !this.SUPPORTED_FORMAT_VERSIONS.includes(formatVer)) {
        return { 
          success: false, 
          message: `Versi format backup (${formatVer}) tidak didukung oleh aplikasi ini (didukung: versi ${this.SUPPORTED_FORMAT_VERSIONS.join(', ')}).` 
        };
      }

      if (typeof backupData.metadata.schemaVersion === 'number' && backupData.metadata.schemaVersion > this.SCHEMA_VERSION) {
        return { 
          success: false, 
          message: `Backup ini dibuat oleh versi database yang lebih baru (versi skema ${backupData.metadata.schemaVersion}, didukung maks ${this.SCHEMA_VERSION}). Silakan perbarui aplikasi.` 
        };
      }

      if (!backupData.metadata.counts || typeof backupData.metadata.counts !== 'object') {
        return { success: false, message: 'Struktur metadata tidak lengkap: counts tidak ditemukan atau tidak valid.' };
      }

      // Legacy Format Normalization (Format v1 compatibility)
      if (formatVer === 1) {
        backupData.data.userPermissions = Array.isArray(backupData.data.userPermissions) ? backupData.data.userPermissions : [];
        backupData.data.draftSales = Array.isArray(backupData.data.draftSales) ? backupData.data.draftSales : [];
        backupData.data.draftSaleItems = Array.isArray(backupData.data.draftSaleItems) ? backupData.data.draftSaleItems : [];
        backupData.metadata.counts.userPermissions = backupData.metadata.counts.userPermissions ?? 0;
        backupData.metadata.counts.draftSales = backupData.metadata.counts.draftSales ?? 0;
        backupData.metadata.counts.draftSaleItems = backupData.metadata.counts.draftSaleItems ?? 0;
      }

      // Backward compatibility for backups created before Migration 008 (productPriceTiers)
      if (backupData.metadata.counts.productPriceTiers === undefined) {
        backupData.data.productPriceTiers = Array.isArray(backupData.data.productPriceTiers) ? backupData.data.productPriceTiers : [];
        backupData.metadata.counts.productPriceTiers = backupData.data.productPriceTiers.length;
      }

      // Preflight metadata count validation (Fix F-04)
      for (const [propName, tblName] of Object.entries(BACKUP_TABLE_MAPPING)) {
        const expectedCount = (backupData.metadata.counts as any)[propName];
        if (expectedCount === undefined) {
          if (backupData.metadata.archiveType === 'transaction_archive') {
            continue;
          }
          return {
            success: false,
            message: `Metadata counts tidak lengkap: hitungan untuk '${propName}' tidak ditemukan.`
          };
        }

        if (typeof expectedCount !== 'number' || !Number.isInteger(expectedCount) || expectedCount < 0) {
          return {
            success: false,
            message: `Nilai metadata count untuk '${propName}' tidak valid (harus berupa integer non-negatif).`
          };
        }

        const actualArray = backupData.data[propName];
        const actualCount = Array.isArray(actualArray) ? actualArray.length : 0;
        if (actualCount !== expectedCount) {
          return {
            success: false,
            message: `Ketidakcocokan jumlah data pada '${propName}': metadata mengharapkan ${expectedCount}, tetapi data berisi ${actualCount}.`
          };
        }
      }

      // Validate core required collections
      if (backupData.metadata.archiveType !== 'transaction_archive') {
        const requiredTables = [
          'categories', 'products', 'customers', 'roles', 'users',
          'permissions', 'rolePermissions', 'transactions', 'transactionItems',
          'payments', 'stockMovements', 'expenses', 'settings'
        ];
        for (const tbl of requiredTables) {
          if (!Array.isArray(backupData.data[tbl])) {
            return { success: false, message: `Struktur data tidak lengkap: tabel '${tbl}' tidak ditemukan.` };
          }
        }
      } else {
        const requiredArchiveTables = ['transactions', 'transactionItems', 'payments', 'stockMovements'];
        for (const tbl of requiredArchiveTables) {
          if (!Array.isArray(backupData.data[tbl])) {
            return { success: false, message: `Struktur data arsip tidak lengkap: tabel '${tbl}' tidak ditemukan.` };
          }
        }
      }

      // Comprehensive preflight record validation (Fix F-02)
      try {
        this.validateBackupDataRecords(backupData);
      } catch (recErr: any) {
        return {
          success: false,
          message: `Validasi data backup gagal: ${recErr.message}`
        };
      }

      // Structural and hash format validation for imported users
      if (backupData.metadata.archiveType !== 'transaction_archive') {
        if (!Array.isArray(backupData.data.users) || backupData.data.users.length === 0) {
          return { success: false, message: 'Struktur data tidak valid: koleksi pengguna kosong atau tidak ditemukan.' };
        }
        for (const user of backupData.data.users) {
          if (!user || typeof user !== 'object') {
            return { success: false, message: 'Struktur data tidak valid: entri user tidak valid.' };
          }
          if (!user.id || !user.username || !user.role_id) {
            return { success: false, message: 'Struktur data tidak valid: field user wajib (id, username, role_id) tidak lengkap.' };
          }
          if (typeof user.pin_hash !== 'string' || (!isLegacyHash(user.pin_hash) && !isModernHash(user.pin_hash))) {
            return { success: false, message: 'Struktur data tidak valid: kredensial pengguna tidak valid atau rusak.' };
          }
        }
      }

      console.log(`[BackupService] validateBackup successfully validated format v${formatVer}, schema v${backupData.metadata.schemaVersion}`);
      return {
        success: true,
        backup: backupData as BackupData,
      };
    } catch (error: any) {
      console.error('[BackupService] validateBackup unexpected error:', error);
      return { success: false, message: `Gagal memvalidasi file backup: ${error.message || 'Error tidak diketahui'}` };
    }
  }

  async restoreTransactionArchive(archive: BackupData): Promise<{ success: boolean; message?: string }> {
    authorizationService.requirePermission('settings.manage');

    const currentUser = authorizationService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      return { success: false, message: 'Akses ditolak: pengguna aktif tidak ditemukan.' };
    }

    // Revalidate currentUser directly from SQLite database
    let dbUser: UserEntity | null = null;
    try {
      dbUser = await this.userRepo.getById(currentUser.id);
    } catch (err: any) {
      return { success: false, message: `Gagal memverifikasi pengguna dari database: ${err.message}` };
    }

    if (!dbUser || !dbUser.is_active) {
      authorizationService.clearCurrentUser();
      return { success: false, message: 'Akses ditolak: pengguna tidak ditemukan atau tidak aktif di database.' };
    }

    try {
      await authorizationService.setCurrentUser(dbUser.id);
      authorizationService.requirePermission('settings.manage');
    } catch {
      return { success: false, message: 'Akses ditolak: pengguna tidak memiliki izin settings.manage di database.' };
    }

    if (!archive || !archive.metadata || archive.metadata.archiveType !== 'transaction_archive') {
      return { success: false, message: 'Format file tidak valid: bukan file arsip transaksi.' };
    }

    if (!archive.data || !Array.isArray(archive.data.transactions) || archive.data.transactions.length === 0) {
      return { success: false, message: 'Arsip tidak berisi transaksi untuk dipulihkan.' };
    }

    try {
      // Comprehensive preflight record validation (Fix F-02)
      this.validateBackupDataRecords(archive);
    } catch (valErr: any) {
      return { success: false, message: `Validasi arsip gagal: ${valErr.message}` };
    }

    try {
      const db = await getDatabase();
      const txs = archive.data.transactions;
      const txItems = Array.isArray(archive.data.transactionItems) ? archive.data.transactionItems : [];
      const payments = Array.isArray(archive.data.payments) ? archive.data.payments : [];
      const stockMovements = Array.isArray(archive.data.stockMovements) ? archive.data.stockMovements : [];

      for (const t of txs) {
        if (!t || typeof t !== 'object' || !t.id || !t.created_at) {
          return { success: false, message: 'Format data transaksi tidak valid dalam file arsip.' };
        }
      }

      // Check for duplicate transaction IDs already existing in database
      const txIds = txs.map((t: any) => `'${t.id}'`).join(',');
      const existing = await db.getAllAsync(`SELECT id FROM transactions WHERE id IN (${txIds});`);
      if (existing.length > 0) {
        return { success: false, message: `${existing.length} transaksi sudah ada dalam database ini. Restore duplikat diblokir.` };
      }

      // Step A: Create safety snapshot before modifying database (Fix F-05)
      const safetySnapshot = await this.createSafetySnapshot();
      if (!safetySnapshot.success) {
        return {
          success: false,
          message: `Gagal membuat safety snapshot sebelum restore arsip: ${safetySnapshot.message}. Operasi dibatalkan demi keamanan data aktif.`
        };
      }

      // Transaction-only recovery: operates transactionally without touching master tables
      await withTransaction(async (dbClient) => {
        await this.insertRecords(dbClient, 'transactions', txs);
        await this.insertRecords(dbClient, 'transaction_items', txItems);
        await this.insertRecords(dbClient, 'payments', payments);
        await this.insertRecords(dbClient, 'stock_movements', stockMovements);

        const fkViolations = await dbClient.getAllAsync<any>('PRAGMA foreign_key_check;');
        if (fkViolations && fkViolations.length > 0) {
          throw new Error(`Integritas foreign key gagal saat restore arsip transaksi: ${fkViolations.length} pelanggaran relasi.`);
        }
      });

      return { success: true, message: `Arsip transaksi berhasil dipulihkan (${txs.length} transaksi).` };
    } catch (error: any) {
      return { success: false, message: `Gagal memulihkan arsip transaksi: ${error.message}` };
    }
  }

  async restoreBackup(backup: BackupData, options: RestoreOptions): Promise<{ success: boolean; message?: string }> {
    authorizationService.requirePermission('settings.manage');

    const currentUser = authorizationService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      return { success: false, message: 'Akses ditolak: pengguna aktif tidak ditemukan.' };
    }

    // Do not route transaction archive through full database restore (Fix 2)
    if (backup.metadata?.archiveType === 'transaction_archive') {
      return {
        success: false,
        message: 'File ini adalah arsip transaksi, bukan full database backup. Gunakan menu Restore Arsip Transaksi untuk memulihkannya.'
      };
    }

    // Fix 3: Revalidate current user directly against SQLite before any action
    let dbUser: UserEntity | null = null;
    try {
      dbUser = await this.userRepo.getById(currentUser.id);
    } catch (err: any) {
      return { success: false, message: `Gagal memverifikasi pengguna dari database: ${err.message}` };
    }

    if (!dbUser || !dbUser.is_active) {
      authorizationService.clearCurrentUser();
      return { success: false, message: 'Akses ditolak: pengguna tidak ditemukan atau tidak aktif di database.' };
    }

    try {
      await authorizationService.setCurrentUser(dbUser.id);
      authorizationService.requirePermission('settings.manage');
    } catch {
      return { success: false, message: 'Akses ditolak: pengguna tidak memiliki izin settings.manage di database.' };
    }

    // Fix 1: Mandatory PIN verification with no bypass
    if (!options || !options.confirmationPin || typeof options.confirmationPin !== 'string' || options.confirmationPin.trim() === '') {
      return { success: false, message: 'PIN konfirmasi diperlukan untuk memulihkan database.' };
    }

    const isPinValid = await verifyPin(options.confirmationPin, dbUser.pin_hash);
    if (!isPinValid) {
      return { success: false, message: 'Verifikasi PIN gagal. PIN konfirmasi salah.' };
    }

    try {
      // Full Backup Restore Path
      if (backup.metadata?.formatVersion === 1) {
        backup.data.userPermissions = Array.isArray(backup.data.userPermissions) ? backup.data.userPermissions : [];
        backup.data.draftSales = Array.isArray(backup.data.draftSales) ? backup.data.draftSales : [];
        backup.data.draftSaleItems = Array.isArray(backup.data.draftSaleItems) ? backup.data.draftSaleItems : [];
        if (backup.metadata.counts) {
          backup.metadata.counts.userPermissions = backup.metadata.counts.userPermissions ?? 0;
          backup.metadata.counts.draftSales = backup.metadata.counts.draftSales ?? 0;
          backup.metadata.counts.draftSaleItems = backup.metadata.counts.draftSaleItems ?? 0;
        }
      }

      // Preflight comprehensive record validation (Fix F-02)
      this.validateBackupDataRecords(backup);

      const db = await getDatabase();
      const currentUsers = await db.getAllAsync<UserEntity>('SELECT * FROM users;');

      // Pre-flight credential validation & anti-downgrade check before touching any database state
      await this.validateImportedCredentials(backup.data.users, currentUsers);

      // Step A: Create safety snapshot of current active database before any changes (Fix F-03)
      const safetyBackup = await this.createSafetySnapshot();
      if (!safetyBackup.success) {
        return {
          success: false,
          message: `Gagal membuat safety snapshot sebelum restore: ${safetyBackup.message}. Operasi restore dibatalkan demi keamanan data aktif.`
        };
      }

      // Step B: Atomic Transactional Restore
      await withTransaction(async (db) => {
        // Clear existing tables in strict reverse-topological order to avoid foreign-key constraint violations
        const tablesToClear = [
          'draft_sale_items',
          'draft_sales',
          'payments',
          'transaction_items',
          'transactions',
          'stock_movements',
          'expenses',
          'product_price_tiers',
          'user_permissions',
          'role_permissions',
          'products',
          'users',
          'settings',
          'customers',
          'roles',
          'categories',
          'permissions'
        ];

        for (const table of tablesToClear) {
          await db.execAsync(`DELETE FROM ${table};`);
        }

        // Insert backup data in strict topological dependency order (parents before children)
        const data = backup.data;
        
        await this.insertRecords(db, 'permissions', data.permissions);
        await this.insertRecords(db, 'categories', data.categories);
        await this.insertRecords(db, 'roles', data.roles);
        await this.insertRecords(db, 'customers', data.customers);
        await this.insertRecords(db, 'settings', data.settings);
        await this.insertRecords(db, 'users', data.users);
        await this.insertRecords(db, 'role_permissions', data.rolePermissions);
        await this.insertRecords(db, 'user_permissions', data.userPermissions || []);
        await this.insertRecords(db, 'products', data.products);
        await this.insertRecords(db, 'product_price_tiers', data.productPriceTiers || []);
        await this.insertRecords(db, 'expenses', data.expenses);
        await this.insertRecords(db, 'draft_sales', data.draftSales || []);
        await this.insertRecords(db, 'draft_sale_items', data.draftSaleItems || []);
        await this.insertRecords(db, 'transactions', data.transactions);
        await this.insertRecords(db, 'transaction_items', data.transactionItems);
        await this.insertRecords(db, 'payments', data.payments);
        await this.insertRecords(db, 'stock_movements', data.stockMovements);

        // Verify counts after insert
        const verifyCount = async (table: string, expectedCount: number) => {
          const res = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM ${table};`);
          if (!res || res.count !== expectedCount) {
            throw new Error(`Integritas gagal: tabel '${table}' mengharapkan ${expectedCount} data tetapi ditemukan ${res?.count}`);
          }
        };

        const counts = backup.metadata.counts;
        await verifyCount('categories', counts.categories);
        await verifyCount('products', counts.products);
        await verifyCount('customers', counts.customers);
        await verifyCount('roles', counts.roles);
        await verifyCount('users', counts.users);
        await verifyCount('permissions', counts.permissions);
        await verifyCount('role_permissions', counts.rolePermissions);
        if (counts.userPermissions !== undefined) {
          await verifyCount('user_permissions', counts.userPermissions);
        }
        if (counts.draftSales !== undefined) {
          await verifyCount('draft_sales', counts.draftSales);
        }
        if (counts.draftSaleItems !== undefined) {
          await verifyCount('draft_sale_items', counts.draftSaleItems);
        }
        await verifyCount('transactions', counts.transactions);
        await verifyCount('transaction_items', counts.transactionItems);
        await verifyCount('payments', counts.payments);
        await verifyCount('stock_movements', counts.stockMovements);
        await verifyCount('expenses', counts.expenses);
        await verifyCount('settings', counts.settings);
        if (counts.productPriceTiers !== undefined) {
          await verifyCount('product_price_tiers', counts.productPriceTiers);
        }

        // Verify foreign key integrity across all restored tables
        const fkViolations = await db.getAllAsync<any>('PRAGMA foreign_key_check;');
        if (fkViolations && fkViolations.length > 0) {
          throw new Error(`Integritas foreign key gagal: terdeteksi ${fkViolations.length} pelanggaran relasi data.`);
        }
      });

      return { success: true, message: 'Restore data berhasil.' };
    } catch (error: any) {
      console.error('[BackupService] restoreBackup error:', error);
      return { 
        success: false, 
        message: `Gagal memulihkan data: ${error.message || 'Terjadi kesalahan sistem'}. Database telah dibatalkan ke kondisi semula.` 
      };
    }
  }

  /**
   * Validates imported users against security rules before destructive restore operations.
   * - Enforces proper credential formats (PBKDF2 or legacy)
   * - Prevents silent downgrade of modern PBKDF2 credentials to legacy hashes
   * - Detects duplicate user IDs, usernames, and colliding PINs
   */
  private async validateImportedCredentials(importedUsers: any[], currentUsers: UserEntity[]): Promise<void> {
    if (!Array.isArray(importedUsers) || importedUsers.length === 0) {
      throw new Error('Data backup tidak valid: tidak ada data pengguna dalam backup.');
    }

    const seenIds = new Set<string>();
    const seenUsernames = new Set<string>();

    for (const user of importedUsers) {
      if (!user || typeof user !== 'object') {
        throw new Error('Data backup tidak valid: format entri pengguna tidak valid.');
      }
      if (!user.id || !user.username || !user.role_id) {
        throw new Error('Data backup tidak valid: field pengguna wajib (id, username, role_id) tidak lengkap.');
      }
      if (seenIds.has(user.id)) {
        throw new Error('Data backup tidak valid: terdeteksi duplikasi ID pengguna dalam backup.');
      }
      seenIds.add(user.id);

      const normalizedUsername = String(user.username).trim().toLowerCase();
      if (seenUsernames.has(normalizedUsername)) {
        throw new Error('Data backup tidak valid: terdeteksi duplikasi username dalam backup.');
      }
      seenUsernames.add(normalizedUsername);

      if (typeof user.pin_hash !== 'string' || (!isLegacyHash(user.pin_hash) && !isModernHash(user.pin_hash))) {
        throw new Error('Kredensial tidak valid: format pin_hash pengguna tidak dikenali atau rusak.');
      }
    }

    const activeImported = importedUsers.filter(u => u.is_active === 1 || u.is_active === true);
    if (activeImported.length === 0) {
      throw new Error('Data backup tidak valid: tidak ada pengguna aktif dalam backup.');
    }

    // Anti-downgrade check: Prevent replacing modern PBKDF2 credentials with insecure legacy hashes
    const currentHasModern = currentUsers.some(u => isModernHash(u.pin_hash));
    if (currentHasModern) {
      for (const impUser of activeImported) {
        if (isLegacyHash(impUser.pin_hash)) {
          const matchingCurrent = currentUsers.find(
            cu => cu.id === impUser.id || cu.username.toLowerCase() === impUser.username.toLowerCase()
          );
          if (matchingCurrent && isModernHash(matchingCurrent.pin_hash)) {
            throw new Error('Integritas keamanan: tidak dapat mengganti akun PBKDF2 modern dengan kredensial legacy.');
          }
        }
      }

      const allImportedAreLegacy = activeImported.every(u => isLegacyHash(u.pin_hash));
      if (allImportedAreLegacy) {
        throw new Error('Integritas keamanan: backup hanya berisi kredensial legacy dan tidak dapat menggantikan sistem yang sudah menggunakan PBKDF2 modern.');
      }
    }

    // Duplicate PIN detection among active imported users
    // 1. Exact hash collision check
    const seenHashes = new Set<string>();
    for (const u of activeImported) {
      if (seenHashes.has(u.pin_hash)) {
        throw new Error('Integritas kredensial gagal: terdeteksi duplikasi PIN pada data pengguna backup.');
      }
      seenHashes.add(u.pin_hash);
    }

    // 2. Cross-format collision check (if any legacy user exists, verify its PIN against all other users)
    const legacyUsers = activeImported.filter(u => isLegacyHash(u.pin_hash));
    for (const legUser of legacyUsers) {
      const rawPin = legUser.pin_hash.replace(/_hashed$/, '');
      for (const other of activeImported) {
        if (other.id === legUser.id) continue;
        const isMatch = await verifyPin(rawPin, other.pin_hash);
        if (isMatch) {
          throw new Error('Integritas kredensial gagal: terdeteksi duplikasi PIN pada data pengguna backup (konflik PIN antar akun aktif).');
        }
      }
    }
  }

  /**
   * Preflight record validation across all supported tables (Fix F-02).
   * Ensures records match TABLE_SCHEMAS, contain no unexpected properties,
   * satisfy required non-null constraints, match enum and integer types,
   * have unique primary keys, and satisfy within-backup foreign key integrity.
   */
  public validateBackupDataRecords(backupData: BackupData): void {
    if (!backupData || !backupData.data || typeof backupData.data !== 'object') {
      throw new Error('Data backup tidak ditemukan atau tidak valid.');
    }

    const isArchive = backupData.metadata?.archiveType === 'transaction_archive';
    const booleanIntegerFields = new Set(['is_active', 'is_system', 'stock_tracking']);

    // Check each table in data
    for (const [propName, tableName] of Object.entries(BACKUP_TABLE_MAPPING)) {
      const records = backupData.data[propName as keyof typeof backupData.data];
      if (records === undefined) {
        if (isArchive) {
          continue;
        }
        continue;
      }

      if (!Array.isArray(records)) {
        throw new Error(`Data pada tabel '${tableName}' harus berupa array.`);
      }

      const schema = TABLE_SCHEMAS[tableName];
      if (!schema) {
        throw new Error(`Skema tabel '${tableName}' tidak didefinisikan.`);
      }

      const allowedColumns = new Set(schema.columns);
      const seenPrimaryKeys = new Set<string>();

      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        // 1. Must be a non-null object, not an array, not empty
        if (!record || typeof record !== 'object' || Array.isArray(record) || Object.keys(record).length === 0) {
          throw new Error(`Data tidak valid pada tabel '${tableName}' (indeks ${i}): record kosong atau bukan objek.`);
        }

        // 2. Reject unexpected properties
        for (const key of Object.keys(record)) {
          if (!allowedColumns.has(key)) {
            throw new Error(`Data tidak valid pada tabel '${tableName}' (indeks ${i}): properti '${key}' tidak dikenali.`);
          }
        }

        // 3. Required fields check
        for (const reqField of schema.requiredFields) {
          const val = record[reqField];
          if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
            throw new Error(`Data tidak valid pada tabel '${tableName}' (indeks ${i}): field wajib '${reqField}' tidak boleh kosong.`);
          }
        }

        // 4. Integer fields check
        if (schema.integerFields) {
          for (const intField of schema.integerFields) {
            const val = record[intField];
            if (val !== undefined && val !== null) {
              if (booleanIntegerFields.has(intField)) {
                if (typeof val !== 'boolean' && !(typeof val === 'number' && Number.isInteger(val) && (val === 0 || val === 1))) {
                  throw new Error(`Data tidak valid pada tabel '${tableName}' (indeks ${i}): field '${intField}' harus berupa boolean atau integer 0/1.`);
                }
              } else {
                if (typeof val !== 'number' || !Number.isInteger(val)) {
                  throw new Error(`Data tidak valid pada tabel '${tableName}' (indeks ${i}): field '${intField}' harus berupa integer.`);
                }
              }
            }
          }
        }

        // 4b. Decimal numeric fields check (allows finite integers or decimals)
        if (schema.decimalFields) {
          for (const decField of schema.decimalFields) {
            const val = record[decField];
            if (val !== undefined && val !== null) {
              if (typeof val !== 'number' || !Number.isFinite(val) || isNaN(val)) {
                throw new Error(`Data tidak valid pada tabel '${tableName}' (indeks ${i}): field '${decField}' harus berupa angka numerik valid.`);
              }
            }
          }
        }

        // 5. Enums check
        if (schema.enums) {
          for (const [enumField, allowedValues] of Object.entries(schema.enums)) {
            const val = record[enumField];
            if (val !== undefined && val !== null) {
              if (!allowedValues.includes(val)) {
                throw new Error(`Data tidak valid pada tabel '${tableName}' (indeks ${i}): nilai '${val}' pada field '${enumField}' tidak valid (diizinkan: ${allowedValues.join(', ')}).`);
              }
            }
          }
        }

        // 6. Primary key uniqueness
        if (typeof schema.primaryKey === 'string') {
          const pkVal = record[schema.primaryKey];
          if (pkVal !== undefined && pkVal !== null) {
            const pkStr = String(pkVal);
            if (seenPrimaryKeys.has(pkStr)) {
              throw new Error(`Data tidak valid pada tabel '${tableName}': duplikasi primary key '${pkStr}'.`);
            }
            seenPrimaryKeys.add(pkStr);
          }
        } else if (Array.isArray(schema.primaryKey)) {
          const compositeKey = schema.primaryKey.map(k => String(record[k] ?? '')).join(':::');
          if (seenPrimaryKeys.has(compositeKey)) {
            throw new Error(`Data tidak valid pada tabel '${tableName}': duplikasi primary key '${compositeKey}'.`);
          }
          seenPrimaryKeys.add(compositeKey);
        }
      }
    }

    // 7. Within-backup foreign key integrity
    const data = backupData.data;

    if (!isArchive) {
      // Full Backup FK Validation
      const categoryIds = new Set((data.categories || []).map((c: any) => c.id));
      const roleIds = new Set((data.roles || []).map((r: any) => r.id));
      const permissionIds = new Set((data.permissions || []).map((p: any) => p.id));
      const userIds = new Set((data.users || []).map((u: any) => u.id));
      const customerIds = new Set((data.customers || []).map((c: any) => c.id));
      const productIds = new Set((data.products || []).map((p: any) => p.id));
      const draftSaleIds = new Set((data.draftSales || []).map((d: any) => d.id));
      const transactionIds = new Set((data.transactions || []).map((t: any) => t.id));

      // users.role_id -> roles.id
      for (const u of data.users || []) {
        if (!roleIds.has(u.role_id)) {
          throw new Error(`Integritas relasi gagal: role_id '${u.role_id}' pada user '${u.username}' tidak ditemukan dalam roles.`);
        }
      }

      // role_permissions: role_id -> roles.id, permission_id -> permissions.id
      for (const rp of data.rolePermissions || []) {
        if (!roleIds.has(rp.role_id)) {
          throw new Error(`Integritas relasi gagal: role_id '${rp.role_id}' pada role_permissions tidak ditemukan dalam roles.`);
        }
        if (!permissionIds.has(rp.permission_id)) {
          throw new Error(`Integritas relasi gagal: permission_id '${rp.permission_id}' pada role_permissions tidak ditemukan dalam permissions.`);
        }
      }

      // user_permissions: user_id -> users.id, permission_id -> permissions.id
      for (const up of data.userPermissions || []) {
        if (!userIds.has(up.user_id)) {
          throw new Error(`Integritas relasi gagal: user_id '${up.user_id}' pada user_permissions tidak ditemukan dalam users.`);
        }
        if (!permissionIds.has(up.permission_id)) {
          throw new Error(`Integritas relasi gagal: permission_id '${up.permission_id}' pada user_permissions tidak ditemukan dalam permissions.`);
        }
      }

      // products.category_id -> categories.id (optional)
      for (const p of data.products || []) {
        if (p.category_id && !categoryIds.has(p.category_id)) {
          throw new Error(`Integritas relasi gagal: category_id '${p.category_id}' pada produk '${p.name}' tidak ditemukan dalam categories.`);
        }
      }

      // draft_sales: customer_id -> customers.id (optional), created_by -> users.id, cancelled_by -> users.id (optional)
      for (const ds of data.draftSales || []) {
        if (ds.customer_id && !customerIds.has(ds.customer_id)) {
          throw new Error(`Integritas relasi gagal: customer_id '${ds.customer_id}' pada draft sale '${ds.draft_number}' tidak ditemukan.`);
        }
        if (ds.created_by && !userIds.has(ds.created_by)) {
          throw new Error(`Integritas relasi gagal: created_by '${ds.created_by}' pada draft sale '${ds.draft_number}' tidak ditemukan.`);
        }
        if (ds.cancelled_by && !userIds.has(ds.cancelled_by)) {
          throw new Error(`Integritas relasi gagal: cancelled_by '${ds.cancelled_by}' pada draft sale '${ds.draft_number}' tidak ditemukan.`);
        }
      }

      // draft_sale_items: draft_sale_id -> draft_sales.id, product_id -> products.id (optional)
      for (const dsi of data.draftSaleItems || []) {
        if (!draftSaleIds.has(dsi.draft_sale_id)) {
          throw new Error(`Integritas relasi gagal: draft_sale_id '${dsi.draft_sale_id}' pada draft_sale_items tidak ditemukan.`);
        }
        if (dsi.product_id && !productIds.has(dsi.product_id)) {
          throw new Error(`Integritas relasi gagal: product_id '${dsi.product_id}' pada draft_sale_items tidak ditemukan.`);
        }
      }

      // transactions: customer_id -> customers.id (optional), cashier_id -> users.id (optional)
      for (const tx of data.transactions || []) {
        if (tx.customer_id && !customerIds.has(tx.customer_id)) {
          throw new Error(`Integritas relasi gagal: customer_id '${tx.customer_id}' pada transaksi '${tx.transaction_number}' tidak ditemukan.`);
        }
        if (tx.cashier_id && !userIds.has(tx.cashier_id)) {
          throw new Error(`Integritas relasi gagal: cashier_id '${tx.cashier_id}' pada transaksi '${tx.transaction_number}' tidak ditemukan.`);
        }
      }

      // transaction_items: transaction_id -> transactions.id, product_id -> products.id (optional)
      for (const ti of data.transactionItems || []) {
        if (!transactionIds.has(ti.transaction_id)) {
          throw new Error(`Integritas relasi gagal: transaction_id '${ti.transaction_id}' pada transaction_items tidak ditemukan.`);
        }
        if (ti.product_id && !productIds.has(ti.product_id)) {
          throw new Error(`Integritas relasi gagal: product_id '${ti.product_id}' pada transaction_items tidak ditemukan.`);
        }
      }

      // payments: transaction_id -> transactions.id
      for (const pm of data.payments || []) {
        if (!transactionIds.has(pm.transaction_id)) {
          throw new Error(`Integritas relasi gagal: transaction_id '${pm.transaction_id}' pada payments tidak ditemukan.`);
        }
      }

      // stock_movements: product_id -> products.id
      for (const sm of data.stockMovements || []) {
        if (!productIds.has(sm.product_id)) {
          throw new Error(`Integritas relasi gagal: product_id '${sm.product_id}' pada stock_movements tidak ditemukan.`);
        }
      }

      // expenses: created_by -> users.id (optional)
      for (const exp of data.expenses || []) {
        if (exp.created_by && !userIds.has(exp.created_by)) {
          throw new Error(`Integritas relasi gagal: created_by '${exp.created_by}' pada expenses tidak ditemukan.`);
        }
      }

      // product_price_tiers: product_id -> products.id
      for (const pt of data.productPriceTiers || []) {
        if (!productIds.has(pt.product_id)) {
          throw new Error(`Integritas relasi gagal: product_id '${pt.product_id}' pada product_price_tiers tidak ditemukan dalam products.`);
        }
      }
    } else {
      // Archive FK Validation: transaction_items and payments must reference transactions in archive
      const transactionIds = new Set((data.transactions || []).map((t: any) => t.id));

      for (const ti of data.transactionItems || []) {
        if (!transactionIds.has(ti.transaction_id)) {
          throw new Error(`Integritas relasi arsip gagal: transaction_id '${ti.transaction_id}' pada transaction_items tidak ditemukan.`);
        }
      }

      for (const pm of data.payments || []) {
        if (!transactionIds.has(pm.transaction_id)) {
          throw new Error(`Integritas relasi arsip gagal: transaction_id '${pm.transaction_id}' pada payments tidak ditemukan.`);
        }
      }

      for (const sm of data.stockMovements || []) {
        if ((sm.reference_type === 'TRANSACTION' || sm.reference_type === 'SALE') && sm.reference_id) {
          if (!transactionIds.has(sm.reference_id)) {
            throw new Error(`Integritas relasi arsip gagal: reference_id '${sm.reference_id}' pada stock_movements tidak ditemukan dalam arsip transaksi.`);
          }
        }
      }
    }
  }

  /**
   * Safe schema-aware SQL insertion (Fix F-01).
   * - Derives columns from trusted TABLE_SCHEMAS whitelist, NEVER from records[0]
   * - Fallbacks omitted optional columns to TABLE_DEFAULTS or null
   * - Rejects unexpected properties or invalid shapes
   * - Normalizes boolean values to 0/1 for SQLite compatibility
   */
  private async insertRecords(db: any, tableName: string, records: any[]) {
    if (!records || records.length === 0) return;

    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) {
      throw new Error(`Tabel tidak dikenal: ${tableName}`);
    }

    const columns = schema.columns;
    const defaults = TABLE_DEFAULTS[tableName] || {};
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;

    const statement = await db.prepareAsync(sql);
    try {
      for (const record of records) {
        if (!record || typeof record !== 'object' || Array.isArray(record) || Object.keys(record).length === 0) {
          throw new Error(`Data tidak valid untuk tabel ${tableName}: record kosong atau bukan objek.`);
        }

        // Verify no unexpected properties are present in the record
        const allowedColumnsSet = new Set(columns);
        for (const key of Object.keys(record)) {
          if (!allowedColumnsSet.has(key)) {
            throw new Error(`Kolom '${key}' tidak dikenali pada tabel ${tableName}.`);
          }
        }

        const values = columns.map((col) => {
          let val = record[col];
          if (val === undefined) {
            val = defaults[col] ?? null;
          }
          if (typeof val === 'boolean') {
            return val ? 1 : 0;
          }
          return val;
        });

        await statement.executeAsync(values);
      }
    } finally {
      await statement.finalizeAsync();
    }
  }
}

export const backupService = new BackupService();
