import { getDatabase } from '@/database/database';

export const DEMO_CUSTOMERS = [
  { id: 'DEMO_CUST_001', name: 'Demo Customer 01', phone: '081200000001', email: 'demo.customer01@example.test' },
  { id: 'DEMO_CUST_002', name: 'Demo Customer 02', phone: '081200000002', email: 'demo.customer02@example.test' },
  { id: 'DEMO_CUST_003', name: 'Demo Customer 03', phone: '081200000003', email: 'demo.customer03@example.test' },
  { id: 'DEMO_CUST_004', name: 'Demo Customer 04', phone: '081200000004', email: 'demo.customer04@example.test' },
  { id: 'DEMO_CUST_005', name: 'Demo Customer 05', phone: '081200000005', email: 'demo.customer05@example.test' },
  { id: 'DEMO_CUST_006', name: 'Demo Customer 06', phone: '081200000006', email: 'demo.customer06@example.test' },
  { id: 'DEMO_CUST_007', name: 'Demo Customer 07', phone: '081200000007', email: 'demo.customer07@example.test' },
  { id: 'DEMO_CUST_008', name: 'Demo Customer 08', phone: '081200000008', email: 'demo.customer08@example.test' },
  { id: 'DEMO_CUST_009', name: 'Demo Customer 09', phone: '081200000009', email: 'demo.customer09@example.test' },
  { id: 'DEMO_CUST_010', name: 'Demo Customer 10', phone: '081200000010', email: 'demo.customer10@example.test' },
  { id: 'DEMO_CUST_011', name: 'Demo Customer 11', phone: '081200000011', email: 'demo.customer11@example.test' },
  { id: 'DEMO_CUST_012', name: 'Demo Customer 12', phone: '081200000012', email: 'demo.customer12@example.test' },
  { id: 'DEMO_CUST_013', name: 'Demo Customer 13', phone: '081200000013', email: 'demo.customer13@example.test' },
  { id: 'DEMO_CUST_014', name: 'Demo Customer 14', phone: '081200000014', email: 'demo.customer14@example.test' },
  { id: 'DEMO_CUST_015', name: 'Demo Customer 15', phone: '081200000015', email: 'demo.customer15@example.test' },
  { id: 'DEMO_CUST_016', name: 'Demo Customer 16', phone: '081200000016', email: 'demo.customer16@example.test' },
  { id: 'DEMO_CUST_017', name: 'Demo Customer 17', phone: '081200000017', email: 'demo.customer17@example.test' },
  { id: 'DEMO_CUST_018', name: 'Demo Customer 18', phone: '081200000018', email: 'demo.customer18@example.test' },
  { id: 'DEMO_CUST_019', name: 'Demo Customer 19', phone: '081200000019', email: 'demo.customer19@example.test' },
  { id: 'DEMO_CUST_020', name: 'Demo Customer 20', phone: '081200000020', email: 'demo.customer20@example.test' },
];

export async function seedDemoCustomers(): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  let count = 0;

  for (const c of DEMO_CUSTOMERS) {
    await db.runAsync(
      `INSERT OR IGNORE INTO customers (id, name, phone, email, address, notes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Demo Address', 'Demo notes', 1, ?, ?);`,
      [c.id, c.name, c.phone, c.email, now, now]
    );
    count++;
  }

  return count;
}
