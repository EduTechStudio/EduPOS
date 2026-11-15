export type PermissionKey =
  | 'dashboard.view'
  | 'pos.view'
  | 'pos.checkout'
  | 'pos.apply_discount'
  | 'draft.view'
  | 'draft.create'
  | 'draft.resume'
  | 'draft.cancel'
  | 'product.view'
  | 'product.create'
  | 'product.edit'
  | 'product.delete'
  | 'product.stock_adjust'
  | 'customer.view'
  | 'customer.create'
  | 'customer.edit'
  | 'customer.delete'
  | 'transaction.view'
  | 'transaction.view_detail'
  | 'transaction.cancel'
  | 'transaction.refund'
  | 'report.view'
  | 'settings.view'
  | 'settings.manage'
  | 'user.view'
  | 'user.create'
  | 'user.edit'
  | 'user.delete'
  | 'role.manage'
  | 'backup.create'
  | 'backup.restore'
  | 'database.maintenance'
  | 'database.reset'
  | 'demo_data.manage'
  | 'receipt.manage'
  | 'printer.manage'
  | 'payment.manage'
  | 'payment.gateway.manage';

export interface Permission {
  key: PermissionKey;
  label: string;
  category: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
}

export interface RolePermission {
  roleId: string;
  permissions: PermissionKey[];
}
