import { authorizationService } from '../auth/AuthorizationService';
import { getDatabase } from '@/database/database';

import { CartItem, CartTotals } from './POSService';
import { CustomerEntity } from '@/database/types';

export interface DraftSale {
  id: string;
  draft_number: string;
  status: 'ACTIVE' | 'CANCELLED';
  customer_id: string | null;
  subtotal: number;
  discount_amount: number;
  discount_type: 'FIXED' | 'PERCENT';
  discount_value: number;
  total_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DraftSaleItem {
  id: string;
  draft_sale_id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
}

export interface DraftSaleWithItems extends DraftSale {
  items: DraftSaleItem[];
}

export class DraftService {
  async saveDraft(
    cart: CartItem[],
    customer: CustomerEntity | null,
    discount: { type: 'FIXED'|'PERCENT', value: number },
    totals: CartTotals
  ): Promise<string> { 
        const user = authorizationService.getCurrentUser();
    if (!user) throw new Error('Authentication required to save draft');
    const db = await getDatabase();
    const id = ('drf_' + Date.now());
    const draftNumber = `DRF-${Date.now()}`;
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO draft_sales (id, draft_number, status, customer_id, subtotal, discount_amount, discount_type, discount_value, total_amount, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          draftNumber,
          'ACTIVE',
          customer?.id || null,
          totals.subtotal,
          totals.discountAmount,
          discount.type,
          discount.value,
          totals.grandTotal,
          user.id,
          now,
          now,
        ]
      );

      for (const item of cart) {
        await db.runAsync(
          `INSERT INTO draft_sale_items (id, draft_sale_id, product_id, product_name_snapshot, sku_snapshot, quantity, unit_price, discount_amount, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            ('dsi_' + Date.now() + Math.random().toString(36).substring(7)),
            id,
            item.productId,
            item.productName,
            item.sku || null,
            item.quantity,
            item.unitPrice,
            0, // item level discount not implemented yet
            item.subtotal,
          ]
        );
      }
    });

    return id;
  }

  async getActiveDrafts(): Promise<DraftSaleWithItems[]> {
    const db = await getDatabase();
    const drafts = await db.getAllAsync<DraftSale>(
      `SELECT * FROM draft_sales WHERE status = 'ACTIVE' ORDER BY created_at DESC;`
    );

    const results: DraftSaleWithItems[] = [];
    for (const draft of drafts) {
      const items = await db.getAllAsync<DraftSaleItem>(
        `SELECT * FROM draft_sale_items WHERE draft_sale_id = ?;`,
        [draft.id]
      );
      results.push({ ...draft, items });
    }
    return results;
  }

  /**
   * Permission-ready boundary.
   * Do NOT just delete. Update status to CANCELLED.
   */
  async resumeDraft(draftId: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE draft_sales 
       SET status = 'RESUMED', updated_at = ?
       WHERE id = ?;`,
      [now, draftId]
    );
  }

  async cancelDraft(draftId: string): Promise<void> {
    authorizationService.requirePermission('draft.cancel');
            const user = authorizationService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to cancel draft');
    }
    
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE draft_sales 
       SET status = 'CANCELLED', updated_at = ?, cancelled_at = ?, cancelled_by = ?
       WHERE id = ?;`,
      [now, now, user.id, draftId]
    );
  }
}

export const draftService = new DraftService();
