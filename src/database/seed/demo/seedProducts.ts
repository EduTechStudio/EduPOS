import { getDatabase, withTransaction } from '@/database/database';
import { DEMO_CATEGORIES } from './seedCategories';

export const DEMO_PRODUCTS = [
  // Beverages
  { id: 'DEMO_PROD_BEV_001', catId: 'DEMO_CAT_001', sku: 'DEMO-BEV-001', barcode: '8991230001', name: 'Mineral Water 600ml', buy: 2000, sell: 3500, stock: 100, active: 1 },
  { id: 'DEMO_PROD_BEV_002', catId: 'DEMO_CAT_001', sku: 'DEMO-BEV-002', barcode: '8991230002', name: 'Mineral Water 1.5L', buy: 4000, sell: 6500, stock: 50, active: 1 },
  { id: 'DEMO_PROD_BEV_003', catId: 'DEMO_CAT_001', sku: 'DEMO-BEV-003', barcode: '8991230003', name: 'Green Tea', buy: 4500, sell: 8000, stock: 40, active: 1 },
  { id: 'DEMO_PROD_BEV_004', catId: 'DEMO_CAT_001', sku: 'DEMO-BEV-004', barcode: '8991230004', name: 'Black Coffee', buy: 5000, sell: 12000, stock: 30, active: 1 },
  { id: 'DEMO_PROD_BEV_005', catId: 'DEMO_CAT_001', sku: 'DEMO-BEV-005', barcode: '8991230005', name: 'Milk Coffee', buy: 6000, sell: 15000, stock: 25, active: 1 },
  { id: 'DEMO_PROD_BEV_006', catId: 'DEMO_CAT_001', sku: 'DEMO-BEV-006', barcode: '8991230006', name: 'Orange Juice', buy: 4000, sell: 10000, stock: 15, active: 1 },
  { id: 'DEMO_PROD_BEV_007', catId: 'DEMO_CAT_001', sku: 'DEMO-BEV-007', barcode: '8991230007', name: 'Chocolate Drink', buy: 5500, sell: 14000, stock: 20, active: 1 },
  { id: 'DEMO_PROD_BEV_008', catId: 'DEMO_CAT_001', sku: 'DEMO-BEV-008', barcode: '8991230008', name: 'Bottled Tea', buy: 3500, sell: 6000, stock: 60, active: 1 },
  
  // Food
  { id: 'DEMO_PROD_FOD_001', catId: 'DEMO_CAT_002', sku: 'DEMO-FOD-001', barcode: '8991230101', name: 'Fried Rice', buy: 12000, sell: 25000, stock: 20, active: 1 },
  { id: 'DEMO_PROD_FOD_002', catId: 'DEMO_CAT_002', sku: 'DEMO-FOD-002', barcode: '8991230102', name: 'Chicken Rice', buy: 15000, sell: 28000, stock: 15, active: 1 },
  { id: 'DEMO_PROD_FOD_003', catId: 'DEMO_CAT_002', sku: 'DEMO-FOD-003', barcode: '8991230103', name: 'Noodles', buy: 10000, sell: 22000, stock: 25, active: 1 },
  { id: 'DEMO_PROD_FOD_004', catId: 'DEMO_CAT_002', sku: 'DEMO-FOD-004', barcode: '8991230104', name: 'Chicken Noodles', buy: 12000, sell: 24000, stock: 18, active: 1 },
  { id: 'DEMO_PROD_FOD_005', catId: 'DEMO_CAT_002', sku: 'DEMO-FOD-005', barcode: '8991230105', name: 'Fried Chicken', buy: 9000, sell: 18000, stock: 30, active: 1 },
  { id: 'DEMO_PROD_FOD_006', catId: 'DEMO_CAT_002', sku: 'DEMO-FOD-006', barcode: '8991230106', name: 'Chicken Satay', buy: 15000, sell: 30000, stock: 10, active: 1 },
  { id: 'DEMO_PROD_FOD_007', catId: 'DEMO_CAT_002', sku: 'DEMO-FOD-007', barcode: '8991230107', name: 'Beef Burger', buy: 18000, sell: 35000, stock: 2, active: 1 }, // Low stock
  { id: 'DEMO_PROD_FOD_008', catId: 'DEMO_CAT_002', sku: 'DEMO-FOD-008', barcode: '8991230108', name: 'Chicken Burger', buy: 14000, sell: 28000, stock: 3, active: 1 }, // Low stock

  // Bakery
  { id: 'DEMO_PROD_BAK_001', catId: 'DEMO_CAT_003', sku: 'DEMO-BAK-001', barcode: '8991230201', name: 'Chocolate Bread', buy: 4000, sell: 9000, stock: 20, active: 1 },
  { id: 'DEMO_PROD_BAK_002', catId: 'DEMO_CAT_003', sku: 'DEMO-BAK-002', barcode: '8991230202', name: 'Cheese Bread', buy: 4500, sell: 10000, stock: 18, active: 1 },
  { id: 'DEMO_PROD_BAK_003', catId: 'DEMO_CAT_003', sku: 'DEMO-BAK-003', barcode: '8991230203', name: 'Croissant', buy: 8000, sell: 18000, stock: 12, active: 1 },
  { id: 'DEMO_PROD_BAK_004', catId: 'DEMO_CAT_003', sku: 'DEMO-BAK-004', barcode: '8991230204', name: 'Donut Chocolate', buy: 3500, sell: 8000, stock: 25, active: 1 },
  { id: 'DEMO_PROD_BAK_005', catId: 'DEMO_CAT_003', sku: 'DEMO-BAK-005', barcode: '8991230205', name: 'Donut Sugar', buy: 3000, sell: 7000, stock: 30, active: 1 },
  { id: 'DEMO_PROD_BAK_006', catId: 'DEMO_CAT_003', sku: 'DEMO-BAK-006', barcode: '8991230206', name: 'Banana Cake', buy: 15000, sell: 35000, stock: 5, active: 1 },

  // Snacks
  { id: 'DEMO_PROD_SNK_001', catId: 'DEMO_CAT_004', sku: 'DEMO-SNK-001', barcode: '8991230301', name: 'Potato Chips', buy: 8000, sell: 15000, stock: 40, active: 1 },
  { id: 'DEMO_PROD_SNK_002', catId: 'DEMO_CAT_004', sku: 'DEMO-SNK-002', barcode: '8991230302', name: 'Chocolate Bar', buy: 7000, sell: 13000, stock: 35, active: 1 },
  { id: 'DEMO_PROD_SNK_003', catId: 'DEMO_CAT_004', sku: 'DEMO-SNK-003', barcode: '8991230303', name: 'Wafer', buy: 4000, sell: 8000, stock: 50, active: 1 },
  { id: 'DEMO_PROD_SNK_004', catId: 'DEMO_CAT_004', sku: 'DEMO-SNK-004', barcode: '8991230304', name: 'Biscuit', buy: 5000, sell: 10000, stock: 45, active: 1 },
  { id: 'DEMO_PROD_SNK_005', catId: 'DEMO_CAT_004', sku: 'DEMO-SNK-005', barcode: '8991230305', name: 'Peanuts', buy: 9000, sell: 16000, stock: 20, active: 1 },
  { id: 'DEMO_PROD_SNK_006', catId: 'DEMO_CAT_004', sku: 'DEMO-SNK-006', barcode: '8991230306', name: 'Cookies', buy: 12000, sell: 24000, stock: 15, active: 1 },

  // Household
  { id: 'DEMO_PROD_HOU_001', catId: 'DEMO_CAT_005', sku: 'DEMO-HOU-001', barcode: '8991230401', name: 'Tissue', buy: 5000, sell: 10000, stock: 60, active: 1 },
  { id: 'DEMO_PROD_HOU_002', catId: 'DEMO_CAT_005', sku: 'DEMO-HOU-002', barcode: '8991230402', name: 'Dish Soap', buy: 8000, sell: 15000, stock: 30, active: 1 },
  { id: 'DEMO_PROD_HOU_003', catId: 'DEMO_CAT_005', sku: 'DEMO-HOU-003', barcode: '8991230403', name: 'Laundry Detergent', buy: 15000, sell: 28000, stock: 25, active: 1 },
  { id: 'DEMO_PROD_HOU_004', catId: 'DEMO_CAT_005', sku: 'DEMO-HOU-004', barcode: '8991230404', name: 'Floor Cleaner', buy: 12000, sell: 22000, stock: 0, active: 1 }, // Out of stock
  { id: 'DEMO_PROD_HOU_005', catId: 'DEMO_CAT_005', sku: 'DEMO-HOU-005', barcode: '8991230405', name: 'Trash Bags', buy: 10000, sell: 18000, stock: 0, active: 1 }, // Out of stock

  // Personal Care
  { id: 'DEMO_PROD_PER_001', catId: 'DEMO_CAT_006', sku: 'DEMO-PER-001', barcode: '8991230501', name: 'Shampoo', buy: 14000, sell: 25000, stock: 30, active: 1 },
  { id: 'DEMO_PROD_PER_002', catId: 'DEMO_CAT_006', sku: 'DEMO-PER-002', barcode: '8991230502', name: 'Toothpaste', buy: 8000, sell: 15000, stock: 40, active: 1 },
  { id: 'DEMO_PROD_PER_003', catId: 'DEMO_CAT_006', sku: 'DEMO-PER-003', barcode: '8991230503', name: 'Toothbrush', buy: 5000, sell: 10000, stock: 50, active: 1 },
  { id: 'DEMO_PROD_PER_004', catId: 'DEMO_CAT_006', sku: 'DEMO-PER-004', barcode: '8991230504', name: 'Soap', buy: 4000, sell: 8000, stock: 60, active: 1 },
  { id: 'DEMO_PROD_PER_005', catId: 'DEMO_CAT_006', sku: 'DEMO-PER-005', barcode: '8991230505', name: 'Hand Sanitizer', buy: 10000, sell: 20000, stock: 25, active: 1 },

  // Frozen Food
  { id: 'DEMO_PROD_FRZ_001', catId: 'DEMO_CAT_007', sku: 'DEMO-FRZ-001', barcode: '8991230601', name: 'Frozen Nuggets', buy: 25000, sell: 45000, stock: 15, active: 1 },
  { id: 'DEMO_PROD_FRZ_002', catId: 'DEMO_CAT_007', sku: 'DEMO-FRZ-002', barcode: '8991230602', name: 'Frozen Sausage', buy: 20000, sell: 35000, stock: 20, active: 1 },
  { id: 'DEMO_PROD_FRZ_003', catId: 'DEMO_CAT_007', sku: 'DEMO-FRZ-003', barcode: '8991230603', name: 'French Fries', buy: 18000, sell: 32000, stock: 18, active: 1 },
  { id: 'DEMO_PROD_FRZ_004', catId: 'DEMO_CAT_007', sku: 'DEMO-FRZ-004', barcode: '8991230604', name: 'Frozen Meatball', buy: 22000, sell: 40000, stock: 12, active: 0 }, // Inactive product
];

export async function seedDemoProducts(): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  let count = 0;

  await withTransaction(async (tx) => {
    for (let i = 0; i < DEMO_PRODUCTS.length; i++) {
      const p = DEMO_PRODUCTS[i];
      // Insert product
      await tx.runAsync(
        `INSERT OR IGNORE INTO products (id, category_id, sku, barcode, name, description, purchase_price, selling_price, stock_tracking, current_stock, minimum_stock, unit, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 5, 'pcs', ?, ?, ?);`,
        [p.id, p.catId, p.sku, p.barcode, p.name, `Demo ${p.name}`, p.buy, p.sell, p.stock, p.active, now, now]
      );
      
      // Seed initial stock movement for each product so the DB holds the movement log
      if (p.stock > 0) {
        await tx.runAsync(
          `INSERT OR IGNORE INTO stock_movements (id, product_id, movement_type, quantity, reference_type, reference_id, notes, created_at)
           VALUES (?, ?, 'PURCHASE', ?, 'INITIAL_STOCK', 'DEMO_INIT', 'Demo initial stock', ?);`,
          [`DEMO_SM_INIT_${p.id}`, p.id, p.stock, now]
        );
      }
      count++;
    }
  });

  return count;
}
