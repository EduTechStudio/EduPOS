export interface CategoryEntity {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: number; // 1 = true, 0 = false
  created_at: string;
  updated_at: string;
}

export interface ProductEntity {
  id: string;
  category_id: string | null;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  purchase_price: number; // Minor units (e.g. 10000 = Rp 10,000)
  selling_price: number;  // Minor units
  stock_tracking: number; // 1 = true, 0 = false
  current_stock: number;
  minimum_stock: number;
  unit: string;
  image_uri: string | null;
  is_active: number; // 1 = true, 0 = false
  created_at: string;
  updated_at: string;
}

export interface CustomerEntity {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export type TransactionStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'WAITING_FOR_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'EXPIRED';

export interface TransactionEntity {
  id: string;
  transaction_number: string;
  customer_id: string | null;
  cashier_id: string | null;
  status: TransactionStatus;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionItemEntity {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
  created_at: string;
}

export interface PaymentEntity {
  id: string;
  transaction_id: string;
  payment_method: string;
  amount: number;
  received_amount: number;
  change_amount: number;
  reference_number: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  notes: string | null;
  provider: string | null;
  gateway_payment_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGE';

export interface StockMovementEntity {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number; // Positive for additions, negative for sales/deductions
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExpenseEntity {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserEntity {
  id: string;
  name: string;
  username: string;
  pin_hash: string;
  role_id: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface RoleEntity {
  id: string;
  name: string;
  description: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

export interface PermissionEntity {
  id: string;
  key: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface RolePermissionEntity {
  role_id: string;
  permission_id: string;
}

export interface SettingEntity {
  key: string;
  value: string;
  value_type: 'string' | 'number' | 'boolean' | 'json';
  created_at: string;
  updated_at: string;
}

export interface AuthLockoutEntity {
  id: string;
  failed_attempts: number;
  locked_until: string | null;
  updated_at: string;
}

export interface ProductPriceTierEntity {
  id: string;
  product_id: string;
  min_quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}


