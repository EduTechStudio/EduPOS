import { Permission, Role, RolePermission, PermissionKey } from '@/types/permissions';

export const allPermissions: Permission[] = [
  // Dashboard
  { key: 'dashboard.view', label: 'View Dashboard', category: 'dashboard' },
  // POS
  { key: 'pos.view', label: 'View POS', category: 'pos' },
  { key: 'pos.checkout', label: 'Checkout', category: 'pos' },
  { key: 'pos.apply_discount', label: 'Apply Discount', category: 'pos' },
  // Draft
  { key: 'draft.view', label: 'View Drafts', category: 'draft' },
  { key: 'draft.create', label: 'Create Draft', category: 'draft' },
  { key: 'draft.resume', label: 'Resume Draft', category: 'draft' },
  { key: 'draft.cancel', label: 'Cancel Draft', category: 'draft' },
  // Products
  { key: 'product.view', label: 'View Products', category: 'products' },
  { key: 'product.create', label: 'Create Product', category: 'products' },
  { key: 'product.edit', label: 'Edit Product', category: 'products' },
  { key: 'product.delete', label: 'Delete Product', category: 'products' },
  { key: 'product.stock_adjust', label: 'Adjust Stock', category: 'products' },
  // Customers
  { key: 'customer.view', label: 'View Customers', category: 'customers' },
  { key: 'customer.create', label: 'Create Customer', category: 'customers' },
  { key: 'customer.edit', label: 'Edit Customer', category: 'customers' },
  { key: 'customer.delete', label: 'Delete Customer', category: 'customers' },
  // Transactions
  { key: 'transaction.view', label: 'View Transactions', category: 'transactions' },
  { key: 'transaction.view_detail', label: 'View Transaction Detail', category: 'transactions' },
  { key: 'transaction.cancel', label: 'Cancel Transaction', category: 'transactions' },
  { key: 'transaction.refund', label: 'Refund Transaction', category: 'transactions' },
  // Reports
  { key: 'report.view', label: 'View Reports', category: 'reports' },
  // Settings
  { key: 'settings.view', label: 'View Settings', category: 'settings' },
  { key: 'settings.manage', label: 'Manage Settings', category: 'settings' },
  // Users
  { key: 'user.view', label: 'View Users', category: 'users' },
  { key: 'user.create', label: 'Create User', category: 'users' },
  { key: 'user.edit', label: 'Edit User', category: 'users' },
  { key: 'user.delete', label: 'Delete User', category: 'users' },
  { key: 'role.manage', label: 'Manage Roles', category: 'users' },
  // Backup / Database
  { key: 'backup.create', label: 'Create Backup', category: 'backup' },
  { key: 'backup.restore', label: 'Restore Backup', category: 'backup' },
  { key: 'database.maintenance', label: 'Database Maintenance', category: 'backup' },
  { key: 'database.reset', label: 'Reset Database', category: 'backup' },
  { key: 'demo_data.manage', label: 'Manage Demo Data', category: 'backup' },
  // Receipt / Printer
  { key: 'receipt.manage', label: 'Manage Receipt', category: 'hardware' },
  { key: 'printer.manage', label: 'Manage Printer', category: 'hardware' },
  // Payment
  { key: 'payment.manage', label: 'Manage Payments', category: 'payment' },
  { key: 'payment.gateway.manage', label: 'Manage Payment Gateways', category: 'payment' },
];

export const initialRoles: Role[] = [
  { id: 'owner', name: 'Super Admin / Owner', description: 'System owner with full access.', isSystem: true },
  { id: 'cashier', name: 'Cashier', description: 'Front-line staff.', isSystem: true },
];

const cashierPermissionKeys: PermissionKey[] = [
  'dashboard.view',
  'pos.view',
  'pos.checkout',
  'pos.apply_discount',
  'draft.view',
  'draft.create',
  'draft.resume',
  'product.view',
  'customer.view',
  'customer.create',
  'customer.edit',
  'transaction.view',
  'transaction.view_detail',
];

export const defaultRolePermissions: RolePermission[] = [
  { roleId: 'owner', permissions: allPermissions.map(p => p.key) },
  { roleId: 'cashier', permissions: cashierPermissionKeys },
];
