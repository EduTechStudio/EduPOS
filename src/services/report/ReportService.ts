import { getDatabase } from '@/database/database';
import { DateRangePreset, getDateBounds } from '@/utils/dateRange';

export interface ReportSummary {
  grossSales: number;
  totalTransactions: number;
  completedCount: number;
  cancelledCount: number;
  refundedCount: number;
  avgBasketSize: number;
  totalDiscount: number;
  totalItemsSold: number;
}

export interface PaymentBreakdownItem {
  paymentMethod: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface TopProductItem {
  productId: string | null;
  productName: string;
  sku: string | null;
  quantitySold: number;
  totalRevenue: number;
}

export interface ReportFilter {
  dateRange?: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export class ReportService {
  
  /**
   * Aggregate high level summary sales metrics strictly via SQLite aggregation
   */
  async getSummary(filter: ReportFilter = {}): Promise<ReportSummary> {
    const db = await getDatabase();
    const { startDate, endDate } = getDateBounds(filter.dateRange || 'today', filter.startDate, filter.endDate);

    const conditions: string[] = [];
    const params: any[] = [];

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Aggregate transactions
    const txStats = await db.getFirstAsync<{
      total_count: number;
      completed_count: number;
      cancelled_count: number;
      refunded_count: number;
      gross_sales: number;
      total_discount: number;
    }>(
      `SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN status = 'REFUNDED' THEN 1 ELSE 0 END) as refunded_count,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN total_amount ELSE 0 END), 0) as gross_sales,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN discount_amount ELSE 0 END), 0) as total_discount
       FROM transactions
       ${whereClause};`,
      ...params
    );


    const grossSales = txStats?.gross_sales || 0;
    const completedCount = txStats?.completed_count || 0;
    const totalTransactions = txStats?.total_count || 0;
    const cancelledCount = txStats?.cancelled_count || 0;
    const refundedCount = txStats?.refunded_count || 0;
    const totalDiscount = txStats?.total_discount || 0;
    

    const avgBasketSize = completedCount > 0 ? Math.round(grossSales / completedCount) : 0;
    
    // Aggregate items sold
    const itemsStats = await db.getFirstAsync<{ total_items: number }>(
      `SELECT SUM(ti.quantity) as total_items
       FROM transaction_items ti
       INNER JOIN transactions t ON ti.transaction_id = t.id
       ${whereClause.replace(/created_at/g, 't.created_at')} AND t.status = 'COMPLETED';`,
      ...params
    );
    const totalItemsSold = itemsStats?.total_items || 0;
    

    return {
      grossSales,
      totalTransactions,
      completedCount,
      cancelledCount,
      refundedCount,
      avgBasketSize,
      totalDiscount,
      totalItemsSold,
    };
  }

  /**
   * Aggregate payment method breakdown using SQLite JOIN and GROUP BY
   */
  async getPaymentBreakdown(filter: ReportFilter = {}): Promise<PaymentBreakdownItem[]> {
    const db = await getDatabase();
    const { startDate, endDate } = getDateBounds(filter.dateRange || 'today', filter.startDate, filter.endDate);

    const conditions: string[] = ["t.status = 'COMPLETED'"];
    const params: any[] = [];

    if (startDate) {
      conditions.push('t.created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('t.created_at <= ?');
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const rows = await db.getAllAsync<{
      payment_method: string;
      total_amount: number;
      tx_count: number;
    }>(
      `SELECT 
        p.payment_method,
        COALESCE(SUM(p.amount), 0) as total_amount,
        COUNT(DISTINCT p.transaction_id) as tx_count
       FROM payments p
       INNER JOIN transactions t ON p.transaction_id = t.id
       ${whereClause}
       GROUP BY p.payment_method
       ORDER BY total_amount DESC;`,
      ...params
    );

    const grandTotal = rows.reduce((sum, r) => sum + r.total_amount, 0);

    return rows.map((r) => ({
      paymentMethod: r.payment_method,
      totalAmount: r.total_amount,
      transactionCount: r.tx_count,
      percentage: grandTotal > 0 ? Number(((r.total_amount / grandTotal) * 100).toFixed(1)) : 0,
    }));
  }

  /**
   * Aggregate top selling products via SQLite JOIN & GROUP BY
   */
  async getTopProducts(filter: ReportFilter = {}, limit: number = 10): Promise<TopProductItem[]> {
    const db = await getDatabase();
    const { startDate, endDate } = getDateBounds(filter.dateRange || 'today', filter.startDate, filter.endDate);

    const conditions: string[] = ["t.status = 'COMPLETED'"];
    const params: any[] = [];

    if (startDate) {
      conditions.push('t.created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('t.created_at <= ?');
      params.push(endDate);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const rows = await db.getAllAsync<{
      product_id: string | null;
      product_name_snapshot: string;
      sku_snapshot: string | null;
      quantity_sold: number;
      total_revenue: number;
    }>(
      `SELECT 
        ti.product_id,
        ti.product_name_snapshot,
        ti.sku_snapshot,
        SUM(ti.quantity) as quantity_sold,
        SUM(ti.subtotal) as total_revenue
       FROM transaction_items ti
       INNER JOIN transactions t ON ti.transaction_id = t.id
       ${whereClause}
       GROUP BY ti.product_id, ti.product_name_snapshot
       ORDER BY quantity_sold DESC
       LIMIT ${Number(limit)};`,
      ...params
    );

    return rows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name_snapshot,
      sku: r.sku_snapshot,
      quantitySold: r.quantity_sold,
      totalRevenue: r.total_revenue,
    }));
  }
}

export const reportService = new ReportService();
