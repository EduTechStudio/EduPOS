import { DateRangePreset, getDateBounds } from '@/utils/dateRange';
import {
  transactionRepository,
  transactionItemRepository,
  paymentRepository,
  customerRepository,
  userRepository,
  TransactionQueryOptions,
  withTransaction,
} from '@/database';
import {
  TransactionEntity,
  TransactionItemEntity,
  PaymentEntity,
  CustomerEntity,
  UserEntity,
} from '@/database/types';
import { authorizationService, PermissionDeniedError } from '@/services/auth/AuthorizationService';



export interface GetTransactionsFilter {
  search?: string;
  dateRange?: DateRangePreset;
  startDate?: string; // ISO String
  endDate?: string;   // ISO String
  paymentMethod?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionListItem extends TransactionEntity {
  customer_name?: string | null;
  cashier_name?: string | null;
  payment_methods?: string[];
}

export interface TransactionDetail {
  transaction: TransactionEntity;
  customer: CustomerEntity | null;
  cashier: UserEntity | null;
  items: TransactionItemEntity[];
  payments: PaymentEntity[];
}

export class TransactionService {
  /**
   * Helper to parse date range presets into ISO start/end strings
   */
  private getDateBounds(preset: DateRangePreset, customStart?: string, customEnd?: string): { startDate?: string; endDate?: string } {
    const now = new Date();
    
    if (preset === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (preset === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }

    if (preset === 'week') {
      // Last 7 days
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }

    if (preset === 'month') {
      // Start of current month to now
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }

    if (preset === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }

    return {}; // 'all'
  }

  async getTransactions(filter: GetTransactionsFilter = {}): Promise<TransactionListItem[]> {
    const dateBounds = getDateBounds(filter.dateRange || 'all', filter.startDate, filter.endDate);

    const queryOpts: TransactionQueryOptions = {
      search: filter.search,
      startDate: dateBounds.startDate,
      endDate: dateBounds.endDate,
      paymentMethod: filter.paymentMethod && filter.paymentMethod !== 'all' ? filter.paymentMethod : undefined,
      status: filter.status && filter.status !== 'all' ? filter.status : undefined,
      limit: filter.limit,
      offset: filter.offset,
    };

    const transactions = await transactionRepository.getFiltered(queryOpts);

    // Fetch related customers & payments for display
    const items: TransactionListItem[] = await Promise.all(
      transactions.map(async (tx) => {
        let customer_name: string | null = null;
        let cashier_name: string | null = null;

        if (tx.customer_id) {
          const cust = await customerRepository.getById(tx.customer_id);
          if (cust) customer_name = cust.name;
        }

        if (tx.cashier_id) {
          const cashier = await userRepository.getById(tx.cashier_id);
          if (cashier) cashier_name = cashier.name;
        }

        const payments = await paymentRepository.getByTransactionId(tx.id);
        const payment_methods = Array.from(new Set(payments.map((p) => p.payment_method)));

        return {
          ...tx,
          customer_name,
          cashier_name: cashier_name || (tx.cashier_id),
          payment_methods,
        };
      })
    );

    return items;
  }

  async getTransactionDetail(transactionId: string): Promise<TransactionDetail | null> {
    const tx = await transactionRepository.getById(transactionId);
    if (!tx) return null;

    const customer = tx.customer_id ? await customerRepository.getById(tx.customer_id) : null;
    const cashier = tx.cashier_id ? await userRepository.getById(tx.cashier_id) : null;
    const items = await transactionItemRepository.getByTransactionId(tx.id);
    const payments = await paymentRepository.getByTransactionId(tx.id);

    return {
      transaction: tx,
      customer,
      cashier,
      items,
      payments,
    };
  }

  /**
   * Safely deletes an individual transaction.
   * COMPLETED and REFUNDED transactions cannot be deleted individually to protect accounting/inventory audit trail.
   * Only CANCELLED transactions can be deleted individually with proper authorization.
   */
  async deleteTransaction(transactionId: string): Promise<{ success: boolean; message?: string }> {
    if (!authorizationService.hasAnyPermission(['settings.manage', 'transaction.cancel'])) {
      throw new PermissionDeniedError('transaction.cancel');
    }

    const tx = await transactionRepository.getById(transactionId);
    if (!tx) {
      throw new Error('Transaksi tidak ditemukan.');
    }

    if (tx.status === 'COMPLETED' || tx.status === 'REFUNDED') {
      throw new Error(
        `Transaksi dengan status ${tx.status} tidak dapat dihapus secara individual demi integritas pembukuan dan stok. Gunakan menu Arsip Transaksi (Transaction Archive) di Pengaturan Sistem untuk mengarsipkan dan membersihkan riwayat penjualan.`
      );
    }

    // Atomic deletion of child and parent records inside a database transaction
    await withTransaction(async (dbClient) => {
      // 1. Delete stock_movements linked to this transaction
      await dbClient.runAsync(
        `DELETE FROM stock_movements WHERE reference_type IN ('TRANSACTION', 'SALE') AND reference_id = ?;`,
        [transactionId]
      );

      // 2. Delete payments linked to this transaction
      await dbClient.runAsync(
        `DELETE FROM payments WHERE transaction_id = ?;`,
        [transactionId]
      );

      // 3. Delete transaction_items linked to this transaction
      await dbClient.runAsync(
        `DELETE FROM transaction_items WHERE transaction_id = ?;`,
        [transactionId]
      );

      // 4. Delete the transaction itself
      await dbClient.runAsync(
        `DELETE FROM transactions WHERE id = ?;`,
        [transactionId]
      );

      // 5. Verify FK integrity
      const fkViolations = await dbClient.getAllAsync<any>('PRAGMA foreign_key_check;');
      if (fkViolations && fkViolations.length > 0) {
        throw new Error(`Integritas foreign key gagal saat menghapus transaksi: ${fkViolations.length} pelanggaran relasi.`);
      }
    });

    return {
      success: true,
      message: `Transaksi ${tx.transaction_number} berhasil dihapus.`,
    };
  }
}

export const transactionService = new TransactionService();
