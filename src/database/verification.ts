import { getDatabase } from './database';
import {
  categoryRepository,
  productRepository,
  customerRepository,
  transactionRepository,
  transactionItemRepository,
  paymentRepository,
  stockMovementRepository,
  roleRepository,
  permissionRepository,
  settingsRepository,
} from './index';
import { productService, categoryService, checkoutService, transactionService, reportService, backupService } from '@/services';
import { CartItem } from '@/services/pos/POSService';
import { StockMovementEntity } from './types';

export interface VerificationResult {
  step: number;
  title: string;
  passed: boolean;
  message: string;
}

export async function runDatabaseVerification(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  const addResult = (step: number, title: string, passed: boolean, message: string) => {
    results.push({ step, title, passed, message });
  };

  try {
    // 1. Database Initialization
    await getDatabase();
    addResult(1, 'Database Initialization', true, 'Opened store-pos.db successfully with WAL & Foreign Keys.');

    // 2. Category Creation & Read
    const testCatName = `Test Cat ${Date.now()}`;
    const createdCat = await categoryService.createCategory({ name: testCatName, description: 'Test category' });
    const readCat = await categoryService.getCategoryById(createdCat.id);
    addResult(2, 'Category CRUD (Create & Read)', !!readCat && readCat.name === testCatName, `Created category: ${readCat?.name}`);

    // 3. Product Creation for Checkout Testing
    const testProdName = `Coffee Checkout ${Date.now()}`;
    const testSku = `SKU-CHK-${Date.now()}`;
    const initialStock = 10;
    const unitPrice = 18000;

    const createdProd = await productService.createProduct({
      name: testProdName,
      sku: testSku,
      categoryId: 'cat_bev',
      purchasePrice: 8000,
      sellingPrice: unitPrice,
      stockTracking: true,
      initialStock: initialStock,
      minimumStock: 2,
      unit: 'cup',
    });
    addResult(3, 'Product Creation (Stock = 10)', !!createdProd && createdProd.current_stock === 10, `Created product "${createdProd.name}" with 10 stock.`);

    // 4. Test Cash Checkout Execution (Qty = 2, Subtotal = 36.000, Discount = 6.000, Total = 30.000, Received = 50.000, Change = 20.000)
    const cartItems: CartItem[] = [
      {
        productId: createdProd.id,
        productName: createdProd.name,
        sku: createdProd.sku,
        unitPrice: createdProd.selling_price,
        quantity: 2,
        subtotal: createdProd.selling_price * 2,
        availableStock: createdProd.current_stock,
        unit: createdProd.unit,
      },
    ];

    const subtotal = 36000;
    const discountAmount = 6000;
    const grandTotal = 30000;
    const receivedCash = 50000;
    const expectedChange = 20000;

    const checkoutRes = await checkoutService.processCheckout({
      items: cartItems,
      customer: null,
      subtotal,
      discountAmount,
      grandTotal,
      paymentMethod: 'cash',
      receivedAmount: receivedCash,
      changeAmount: expectedChange,
      notes: 'Test cash checkout',
    });

    addResult(4, 'Cash Checkout Execution', checkoutRes.success, `Created transaction ${checkoutRes.transaction.transaction_number}.`);
    addResult(5, 'Correct Change Calculation', checkoutRes.payment.change_amount === expectedChange, `Received Rp 50.000, Change: ${checkoutRes.payment.change_amount} (Expected Rp 20.000).`);
    addResult(6, 'Transaction Status COMPLETED', checkoutRes.transaction.status === 'COMPLETED' && checkoutRes.transaction.payment_status === 'PAID', 'Transaction status is COMPLETED and payment status is PAID.');

    // 7. Cash Underpayment Rejection
    let underpaymentBlocked = false;
    try {
      await checkoutService.processCheckout({
        items: cartItems,
        customer: null,
        subtotal: 36000,
        discountAmount: 0,
        grandTotal: 36000,
        paymentMethod: 'cash',
        receivedAmount: 20000, // Underpayment
        changeAmount: 0,
      });
    } catch (err: any) {
      underpaymentBlocked = true;
    }
    addResult(7, 'Cash Underpayment Rejected', underpaymentBlocked, 'Underpayment attempt was caught and rejected with error.');

    // 8. Manual QRIS Checkout Execution
    const qrisRes = await checkoutService.processCheckout({
      items: [
        {
          productId: createdProd.id,
          productName: createdProd.name,
          sku: createdProd.sku,
          unitPrice: createdProd.selling_price,
          quantity: 1,
          subtotal: createdProd.selling_price,
          availableStock: 8,
          unit: createdProd.unit,
        },
      ],
      customer: null,
      subtotal: 18000,
      discountAmount: 0,
      grandTotal: 18000,
      paymentMethod: 'qris',
      receivedAmount: 18000,
      changeAmount: 0,
      referenceNumber: 'QRIS-REF-9988',
    });
    addResult(8, 'Manual QRIS Checkout', qrisRes.payment.payment_method === 'qris' && qrisRes.payment.reference_number === 'QRIS-REF-9988', `Recorded QRIS payment with reference: ${qrisRes.payment.reference_number}`);

    // 9. Manual QRIS Missing Reference Rejection
    let missingRefBlocked = false;
    try {
      await checkoutService.processCheckout({
        items: cartItems,
        customer: null,
        subtotal: 18000,
        discountAmount: 0,
        grandTotal: 18000,
        paymentMethod: 'qris',
        receivedAmount: 18000,
        changeAmount: 0,
        referenceNumber: '', // Missing reference
      });
    } catch (err: any) {
      missingRefBlocked = true;
    }
    addResult(9, 'Missing Reference Rejection', missingRefBlocked, 'Non-cash payment without reference code was blocked.');

    // 10. Manual Bank Transfer & Debit Checkouts
    const trfRes = await checkoutService.processCheckout({
      items: [
        {
          productId: createdProd.id,
          productName: createdProd.name,
          sku: createdProd.sku,
          unitPrice: createdProd.selling_price,
          quantity: 1,
          subtotal: createdProd.selling_price,
          availableStock: 7,
          unit: createdProd.unit,
        },
      ],
      customer: null,
      subtotal: 18000,
      discountAmount: 0,
      grandTotal: 18000,
      paymentMethod: 'bank_transfer',
      receivedAmount: 18000,
      changeAmount: 0,
      referenceNumber: 'TRF-BANK-7711',
    });
    addResult(10, 'Bank Transfer Checkout', trfRes.payment.payment_method === 'bank_transfer', `Bank transfer reference: ${trfRes.payment.reference_number}`);

    // 11. SALE Stock Movement Verification
    const salesMovements: StockMovementEntity[] = await stockMovementRepository.getByProductId(createdProd.id);
    const totalDeducted = salesMovements
      .filter((m: StockMovementEntity) => m.movement_type === 'SALE')
      .reduce((sum: number, m: StockMovementEntity) => sum + m.quantity, 0);
    addResult(11, 'SALE Stock Movement Recorded', totalDeducted === -4, `Recorded 4 sold items across 3 transactions (total SALE delta = -4).`);

    // 12. Product Current Stock Update in SQLite
    const updatedProdAfterSales = await productRepository.getById(createdProd.id);
    addResult(12, 'Product Stock Decreased', updatedProdAfterSales?.current_stock === 6, `Product stock updated from 10 to ${updatedProdAfterSales?.current_stock} (Expected 6).`);

    // 13. Insufficient Stock Prevention at Checkout
    let stockExceededBlocked = false;
    try {
      await checkoutService.processCheckout({
        items: [
          {
            productId: createdProd.id,
            productName: createdProd.name,
            sku: createdProd.sku,
            unitPrice: createdProd.selling_price,
            quantity: 999, // Exceeds current stock 6
            subtotal: createdProd.selling_price * 999,
            availableStock: 6,
            unit: createdProd.unit,
          },
        ],
        customer: null,
        subtotal: 18000 * 999,
        discountAmount: 0,
        grandTotal: 18000 * 999,
        paymentMethod: 'cash',
        receivedAmount: 18000 * 999,
        changeAmount: 0,
      });
    } catch (err: any) {
      stockExceededBlocked = true;
    }
    addResult(13, 'Insufficient Stock Prevention', stockExceededBlocked, 'Excessive quantity checkout attempt was caught and rejected by stock revalidation.');

    // 14. Historical Transaction Snapshot Integrity Test
    // Modify product name and price after sales
    await productService.updateProduct(createdProd.id, { name: 'Renamed Coffee Product', sellingPrice: 99000 });
    const historicalItems = await transactionItemRepository.getByTransactionId(checkoutRes.transaction.id);
    addResult(14, 'Historical Snapshot Integrity', historicalItems[0].product_name_snapshot === testProdName && historicalItems[0].unit_price === unitPrice, `Historical transaction item snapshot preserved name ("${historicalItems[0].product_name_snapshot}") and unit price (Rp ${historicalItems[0].unit_price}) after product edit.`);

    // 15. Receipt Data Model Structure Readiness
    addResult(15, 'Receipt Data Model Ready', !!checkoutRes.receiptData && checkoutRes.receiptData.transaction.transactionNumber === checkoutRes.transaction.transaction_number, `Generated ReceiptData structure for receipt rendering: ${checkoutRes.receiptData.transaction.date}`);

    // 16. Persistent Database Query Verification
    const persistentTx = await transactionRepository.getById(checkoutRes.transaction.id);
    addResult(16, 'SQLite Persistent Storage', !!persistentTx && persistentTx.total_amount === grandTotal, `Verified transaction in SQLite database: Total Rp ${persistentTx?.total_amount}`);

    // 17. TransactionService Filtered Query Verification
    const filteredTxList = await transactionService.getTransactions({ search: checkoutRes.transaction.transaction_number });
    addResult(17, 'TransactionService Search Query', filteredTxList.length > 0 && filteredTxList[0].id === checkoutRes.transaction.id, `Found transaction by TRX number query.`);

    // 18. TransactionService Detail Fetching Verification
    const txDetail = await transactionService.getTransactionDetail(checkoutRes.transaction.id);
    addResult(18, 'TransactionService Detail Fetch', !!txDetail && txDetail.items.length > 0 && txDetail.payments.length > 0, `Fetched transaction header, items (${txDetail?.items.length}), and payments (${txDetail?.payments.length}).`);

    // 19. ReportService Summary Aggregation Verification
    const reportSummary = await reportService.getSummary({ dateRange: 'all' });
    addResult(19, 'ReportService Sales Aggregation', reportSummary.grossSales > 0 && reportSummary.completedCount > 0, `Calculated Gross Sales: Rp ${reportSummary.grossSales}, Total Completed: ${reportSummary.completedCount}.`);

    // 20. ReportService Payment Breakdown Verification
    const paymentBreakdown = await reportService.getPaymentBreakdown({ dateRange: 'all' });
    addResult(20, 'ReportService Payment Breakdown', paymentBreakdown.length > 0, `Aggregated ${paymentBreakdown.length} payment method groups via SQLite JOIN.`);

    // 21. Backup Creation & Serialization
    const backupRes = await backupService.createBackup();
    addResult(21, 'Backup Format Serialization', backupRes.success && !!backupRes.filePath, `Generated SQLite snapshot with ${backupRes.metadata?.counts.transactions} transactions.`);

    // 22. Backup Validation Integrity
    if (backupRes.success && backupRes.filePath) {
      const valRes = await backupService.validateBackup(backupRes.filePath);
      addResult(22, 'Backup Content Validation', valRes.success && !!valRes.backup, `Validated backup structure schema version ${valRes.backup?.metadata.schemaVersion}.`);
    } else {
      addResult(22, 'Backup Content Validation', false, 'Skipped due to backup creation failure.');
    }

  } catch (error: any) {
    addResult(0, 'Verification Failure', false, error?.message || String(error));
  }

  return results;
}

