import { getDatabase, withTransaction } from './database';
import { CategoryRepository } from './repositories/CategoryRepository';
import { ProductRepository } from './repositories/ProductRepository';
import { CustomerRepository } from './repositories/CustomerRepository';
import { TransactionRepository } from './repositories/TransactionRepository';
import { TransactionItemRepository } from './repositories/TransactionItemRepository';
import { PaymentRepository } from './repositories/PaymentRepository';
import { StockMovementRepository } from './repositories/StockMovementRepository';
import { ExpenseRepository } from './repositories/ExpenseRepository';
import { UserRepository } from './repositories/UserRepository';
import { RoleRepository } from './repositories/RoleRepository';
import { PermissionRepository } from './repositories/PermissionRepository';
import { SettingsRepository } from './repositories/SettingsRepository';
import { ProductPriceTierRepository } from './repositories/ProductPriceTierRepository';

export * from './types';
export * from './database';
export * from './migrations';
export * from './seed';
export * from './repositories/TransactionRepository';
export * from './repositories/ProductPriceTierRepository';


// Singleton Repository Instances
export const categoryRepository = new CategoryRepository();
export const productRepository = new ProductRepository();
export const customerRepository = new CustomerRepository();
export const transactionRepository = new TransactionRepository();
export const transactionItemRepository = new TransactionItemRepository();
export const paymentRepository = new PaymentRepository();
export const stockMovementRepository = new StockMovementRepository();
export const expenseRepository = new ExpenseRepository();
export const userRepository = new UserRepository();
export const roleRepository = new RoleRepository();
export const permissionRepository = new PermissionRepository();
export const settingsRepository = new SettingsRepository();
export const productPriceTierRepository = new ProductPriceTierRepository();

export const DatabaseService = {
  init: getDatabase,
  getDb: getDatabase,
  withTransaction,
  category: categoryRepository,
  product: productRepository,
  customer: customerRepository,
  transaction: transactionRepository,
  transactionItem: transactionItemRepository,
  payment: paymentRepository,
  stockMovement: stockMovementRepository,
  expense: expenseRepository,
  user: userRepository,
  role: roleRepository,
  permission: permissionRepository,
  settings: settingsRepository,
  productPriceTier: productPriceTierRepository,
};
