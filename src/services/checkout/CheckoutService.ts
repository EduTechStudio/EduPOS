import { authorizationService } from '../auth/AuthorizationService';
import {
  withTransaction,
  transactionRepository,
  transactionItemRepository,
  paymentRepository,
  stockMovementRepository,
  productRepository,
} from '@/database';
import {
  TransactionEntity,
  TransactionItemEntity,
  PaymentEntity,
  StockMovementEntity,
  CustomerEntity,
} from '@/database/types';
import { CartItem } from '@/services/pos/POSService';
import { generateTransactionNumber } from '@/utils/transactionNumber';
import { ReceiptService, ReceiptData } from '@/services/receipt/ReceiptService';
import { defaultReceiptConfig } from '@/config/defaultReceiptConfig';

export interface ProcessCheckoutInput {
  items: CartItem[];
  customer: CustomerEntity | null;
  cashierId?: string | null;
  cashierName?: string;
  subtotal: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: string;
  receivedAmount: number;
  changeAmount: number;
  referenceNumber?: string | null;
  notes?: string | null;
  createdAt?: string; // Support for seed data
}

export interface CheckoutResult {
  success: boolean;
  transaction: TransactionEntity;
  items: TransactionItemEntity[];
  payment: PaymentEntity;
  movements: StockMovementEntity[];
  receiptData: ReceiptData;
}

const receiptService = new ReceiptService();

export class CheckoutService {
  private _ensureUser(inputCashierId?: string | null) {
    const id = inputCashierId || authorizationService.getCurrentUser()?.id;
    if (id === null) throw new Error('Authentication required for checkout');
    if (!id) throw new Error('Authentication required for checkout');
    return id;
  }
  async createGatewayCheckoutIntent(input: ProcessCheckoutInput): Promise<{ transactionId: string, paymentResult: any }> {
    if (!input.items || input.items.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }

    const now = new Date().toISOString();
    const ts = Date.now();
    const txId = `tx_${ts}_${Math.floor(Math.random() * 1000)}`;
    const txNumber = await generateTransactionNumber();

    const { paymentService } = await import('@/services/payment/PaymentService');
    const paymentResult = await paymentService.createGatewayPayment({
      transactionId: txId,
      transactionNumber: txNumber,
      amount: input.grandTotal,
      currency: 'IDR',
      method: input.paymentMethod,
      customerName: input.customer?.name
    });

    await withTransaction(async (db) => {
      // Create transaction as PENDING
      await db.runAsync(
        `INSERT INTO transactions (id, transaction_number, customer_id, cashier_id, status, subtotal, discount_amount, tax_amount, total_amount, payment_status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?, ?, 0, ?, 'WAITING_FOR_PAYMENT', ?, ?, ?);`,
        [
          txId, txNumber, input.customer?.id || null, this._ensureUser(input.cashierId),
          input.subtotal, input.discountAmount, input.grandTotal, input.notes?.trim() || null, now, now,
        ]
      );

      // Items snapshot
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        const itemId = `ti_${txId}_${i + 1}`;
        await db.runAsync(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, discount_amount, subtotal, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
          [
            itemId, txId, item.productId, item.productName, item.sku,
            item.quantity, item.unitPrice, item.subtotal, now,
          ]
        );
      }

      // Payment as WAITING_FOR_PAYMENT
      const payId = `pay_${ts}_${Math.floor(Math.random() * 1000)}`;
      await db.runAsync(
        `INSERT INTO payments (id, transaction_id, payment_method, amount, received_amount, change_amount, reference_number, status, paid_at, notes, provider, gateway_payment_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'WAITING_FOR_PAYMENT', NULL, ?, ?, ?, ?, ?);`,
        [
          payId, txId, input.paymentMethod, input.grandTotal, 0, 0,
          paymentResult.reference || null, null, 'mock', paymentResult.paymentId, now, now
        ]
      );
    });

    return { transactionId: txId, paymentResult };
  }

  async finalizeGatewayCheckout(transactionId: string): Promise<CheckoutResult> {
    const now = new Date().toISOString();
    return withTransaction(async (db) => {
      const tx = await db.getFirstAsync<any>('SELECT * FROM transactions WHERE id = ?', [transactionId]);
      if (!tx || tx.status === 'COMPLETED') throw new Error('Transaction already finalized or not found.');

      const items = await db.getAllAsync<any>('SELECT * FROM transaction_items WHERE transaction_id = ?', [transactionId]);
      const pay = await db.getFirstAsync<any>('SELECT * FROM payments WHERE transaction_id = ?', [transactionId]);

      // Stock movements
      for (const item of items) {
        const latestProd = await db.getFirstAsync<any>('SELECT * FROM products WHERE id = ?;', [item.product_id]);
        if (latestProd && latestProd.stock_tracking === 1) {
          const newStock = latestProd.current_stock - item.quantity;
          await db.runAsync('UPDATE products SET current_stock = ?, updated_at = ? WHERE id = ?;', [newStock, now, item.product_id]);
          
          await db.runAsync(
            `INSERT INTO stock_movements (id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
             VALUES (?, ?, 'SALE', ?, 'TRANSACTION', ?, ?, ?);`,
            [`sm_${Date.now()}_${Math.floor(Math.random() * 1000)}`, item.product_id, -item.quantity, transactionId, 'Penjualan Checkout', now]
          );
        }
      }

      await db.runAsync(`UPDATE transactions SET status = 'COMPLETED', payment_status = 'PAID', updated_at = ? WHERE id = ?;`, [now, transactionId]);
      await db.runAsync(`UPDATE payments SET status = 'PAID', paid_at = ?, received_amount = amount, updated_at = ? WHERE id = ?;`, [now, now, pay.id]);

      const { transactionService } = await import('@/services/transaction/TransactionService');
      const updatedTxDetail = await transactionService.getTransactionDetail(transactionId);
      if (!updatedTxDetail) throw new Error('Transaction detail not found.');
      const rData = await receiptService.buildReceiptDataFromDetail(updatedTxDetail);
      return {
        success: true,
        transaction: updatedTxDetail.transaction,
        items: updatedTxDetail.items,
        payment: updatedTxDetail.payments[0],
        movements: [],
        receiptData: rData

      };
    });
  }

  async failGatewayCheckout(transactionId: string, status: 'FAILED' | 'CANCELLED' | 'EXPIRED'): Promise<void> {
    const now = new Date().toISOString();
    await withTransaction(async (db) => {
      await db.runAsync(`UPDATE transactions SET status = 'CANCELLED', payment_status = ?, updated_at = ? WHERE id = ?;`, [status, now, transactionId]);
      await db.runAsync(`UPDATE payments SET status = ?, updated_at = ? WHERE transaction_id = ?;`, [status, now, transactionId]);
    });
  }
  async processCheckout(input: ProcessCheckoutInput): Promise<CheckoutResult> {
    authorizationService.requirePermission('pos.checkout');
    // 1. Pre-validation
    if (!input.items || input.items.length === 0) {
      throw new Error('Keranjang belanja kosong');
    }

    if (input.paymentMethod === 'cash') {
      if (input.receivedAmount < input.grandTotal) {
        throw new Error('Uang pembayaran kurang.');
      }
    } else {
      if (!input.referenceNumber || input.referenceNumber.trim().length === 0) {
        throw new Error(`Kode referensi wajib diisi untuk pembayaran ${input.paymentMethod.toUpperCase()}`);
      }
    }

    const now = input.createdAt || new Date().toISOString();
    const ts = input.createdAt ? new Date(input.createdAt).getTime() : Date.now();
    const txId = `tx_${ts}_${Math.floor(Math.random() * 1000)}`;

    // 2. Atomic Database Transaction Execution
    return withTransaction(async (db) => {
      // Step A: Final Stock Revalidation against SQLite
      const productTrackingMap = new Map<string, boolean>();
      for (const item of input.items) {
        const latestProd = await db.getFirstAsync<{
          id: string;
          name: string;
          current_stock: number;
          stock_tracking: number;
          is_active: number;
        }>('SELECT id, name, current_stock, stock_tracking, is_active FROM products WHERE id = ?;', [
          item.productId,
        ]);

        if (!latestProd || latestProd.is_active === 0) {
          throw new Error(`Stok berubah. Produk "${item.productName}" sudah tidak aktif.`);
        }

        const isTracked = latestProd.stock_tracking === 1;
        if (isTracked && item.quantity > latestProd.current_stock) {
          throw new Error(
            `Stok berubah. Stok "${item.productName}" saat ini: ${latestProd.current_stock}, di keranjang: ${item.quantity}. Silakan periksa kembali keranjang.`
          );
        }

        productTrackingMap.set(item.productId, isTracked);
      }

      // Step B: Generate Unique Transaction Number
      const txNumber = await generateTransactionNumber();

      // Step C: Insert Transaction Record
      await db.runAsync(
        `INSERT INTO transactions (id, transaction_number, customer_id, cashier_id, status, subtotal, discount_amount, tax_amount, total_amount, payment_status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'COMPLETED', ?, ?, 0, ?, 'PAID', ?, ?, ?);`,
        [
          txId,
          txNumber,
          input.customer?.id || null,
          this._ensureUser(input.cashierId),
          input.subtotal,
          input.discountAmount,
          input.grandTotal,
          input.notes?.trim() || null,
          now,
          now,
        ]
      );

      // Step D: Insert Transaction Items (Snapshotting Product Data)
      const createdItems: TransactionItemEntity[] = [];
      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];
        const itemId = `ti_${txId}_${i + 1}`;

        await db.runAsync(
          `INSERT INTO transaction_items (id, transaction_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, discount_amount, subtotal, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
          [
            itemId,
            txId,
            item.productId,
            item.productName,
            item.sku,
            item.quantity,
            item.unitPrice,
            item.subtotal,
            now,
          ]
        );

        createdItems.push({
          id: itemId,
          transaction_id: txId,
          product_id: item.productId,
          product_name_snapshot: item.productName,
          sku_snapshot: item.sku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: 0,
          subtotal: item.subtotal,
          created_at: now,
        });
      }

      // Step E: Insert Payment Record
      const payId = `pay_${txId}`;
      const recAmt = input.paymentMethod === 'cash' ? input.receivedAmount : input.grandTotal;
      const chgAmt = input.paymentMethod === 'cash' ? Math.max(0, input.receivedAmount - input.grandTotal) : 0;
      const refNum = input.paymentMethod === 'cash' ? null : input.referenceNumber?.trim() || null;

      await db.runAsync(
        `INSERT INTO payments (id, transaction_id, payment_method, amount, received_amount, change_amount, reference_number, status, paid_at, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?);`,
        [
          payId,
          txId,
          input.paymentMethod,
          input.grandTotal,
          recAmt,
          chgAmt,
          refNum,
          now,
          input.notes?.trim() || null,
          now,
          now,
        ]
      );

      const createdPayment: PaymentEntity = {
        id: payId,
        transaction_id: txId,
        payment_method: input.paymentMethod,
        amount: input.grandTotal,
        received_amount: recAmt,
        change_amount: chgAmt,
        reference_number: refNum,
        status: 'PAID',
        paid_at: now,
        notes: input.notes || null,
        provider: null,
        gateway_payment_id: null,
        expires_at: null,
        created_at: now,
        updated_at: now,
      };

      // Step F: Insert SALE Stock Movements and Update Product Stock (Tracked products only)
      const createdMovements: StockMovementEntity[] = [];
      for (const item of input.items) {
        const isTracked = productTrackingMap.get(item.productId) ?? true;
        if (isTracked) {
          const movementId = `sm_sale_${txId}_${item.productId}`;
          const saleQty = -Math.abs(item.quantity);

          await db.runAsync(
            `INSERT INTO stock_movements (id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
             VALUES (?, ?, 'SALE', ?, 'TRANSACTION', ?, 'Penjualan Kasir', ?);`,
            [movementId, item.productId, saleQty, txId, now]
          );

          await db.runAsync(
            `UPDATE products SET current_stock = current_stock - ?, updated_at = ? WHERE id = ?;`,
            [item.quantity, now, item.productId]
          );

          createdMovements.push({
            id: movementId,
            product_id: item.productId,
            movement_type: 'SALE',
            quantity: saleQty,
            reference_type: 'TRANSACTION',
            reference_id: txId,
            notes: 'Penjualan Kasir',
            created_at: now,
          });
        }
      }

      // Step G: Construct Transaction Entity & ReceiptData Structure
      const createdTransaction: TransactionEntity = {
        id: txId,
        transaction_number: txNumber,
        customer_id: input.customer?.id || null,
        cashier_id: this._ensureUser(input.cashierId),
        status: 'COMPLETED',
        subtotal: input.subtotal,
        discount_amount: input.discountAmount,
        tax_amount: 0,
        total_amount: input.grandTotal,
        payment_status: 'PAID',
        notes: input.notes || null,
        created_at: now,
        updated_at: now,
      };

      const txDetail = {
        transaction: createdTransaction,
        customer: input.customer || null,
        cashier: { id: this._ensureUser(input.cashierId), name: input.cashierName || 'Primary Cashier', email: '', role_id: '', pin_hash: null, created_at: '', updated_at: '' },
        items: createdItems,
        payments: [createdPayment]
      };
      
      const formattedReceipt = await receiptService.buildReceiptDataFromDetail(txDetail as any);

      return {
        success: true,
        transaction: createdTransaction,
        items: createdItems,
        payment: createdPayment,
        movements: createdMovements,
        receiptData: formattedReceipt,
      };
    });
  }
}

export const checkoutService = new CheckoutService();
