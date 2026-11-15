import { Transaction } from '@/types/transaction';

export const mockDashboardMetrics = {
  todaySales: 1850000,
  todayTransactionsCount: 24,
  activeProductsCount: 142,
  lowStockItemsCount: 5,
};

export const mockProducts = [
  { id: '1', name: 'Espresso Single Shot', category: 'Beverages', price: 18000, stock: 99, sku: 'DRK-001' },
  { id: '2', name: 'Iced Caramel Latte', category: 'Beverages', price: 28000, stock: 45, sku: 'DRK-002' },
  { id: '3', name: 'Butter Croissant', category: 'Bakery', price: 22000, stock: 12, sku: 'BAK-001' },
  { id: '4', name: 'Avocado Toast & Egg', category: 'Food', price: 35000, stock: 8, sku: 'FOD-001' },
  { id: '5', name: 'Matcha Green Tea Latte', category: 'Beverages', price: 30000, stock: 30, sku: 'DRK-003' },
];

export const mockCustomers = [
  { id: 'c1', name: 'Budi Santoso', phone: '08123456789', points: 150 },
  { id: 'c2', name: 'Siti Rahma', phone: '08571234567', points: 80 },
  { id: 'c3', name: 'Dewi Lestari', phone: '08198765432', points: 220 },
];

export const mockRecentTransactions: Transaction[] = [
  {
    id: 'tx_101',
    transactionNumber: 'TRX-20260924-001',
    createdAt: new Date().toISOString(),
    cashierId: 'u1',
    cashierName: 'Ahmad Cashier',
    customerId: 'c1',
    customerName: 'Budi Santoso',
    items: [
      { id: 'ti1', productId: '2', productName: 'Iced Caramel Latte', quantity: 2, unitPrice: 28000, totalPrice: 56000 },
      { id: 'ti2', productId: '3', productName: 'Butter Croissant', quantity: 1, unitPrice: 22000, totalPrice: 22000 },
    ],
    subtotal: 78000,
    discountAmount: 0,
    taxAmount: 7800,
    totalAmount: 85800,
    paymentMethod: 'cash',
    receivedAmount: 100000,
    changeAmount: 14200,
    status: 'completed',
  },
];

export const mockExpenses = [
  { id: 'e1', description: 'Store Electricity Bill', category: 'Utilities', amount: 450000, date: '2026-09-24' },
  { id: 'e2', description: 'Fresh Whole Milk Supply (10L)', category: 'Inventory Supplies', amount: 220000, date: '2026-09-23' },
];
