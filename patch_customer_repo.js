const fs = require('fs');
let code = fs.readFileSync('src/database/repositories/CustomerRepository.ts', 'utf-8');

if (!code.includes("authorizationService")) {
  code = code.replace(
    "import { CustomerEntity } from '../types';",
    "import { CustomerEntity } from '../types';\nimport { authorizationService } from '../../services/auth/AuthorizationService';"
  );
  
  code = code.replace(
    "async create(data: Omit<CustomerEntity, 'created_at' | 'updated_at'>): Promise<CustomerEntity> {",
    "async create(data: Omit<CustomerEntity, 'created_at' | 'updated_at'>): Promise<CustomerEntity> {\n    authorizationService.requirePermission('customer.create');"
  );
  
  code = code.replace(
    "async update(id: string, data: Partial<Omit<CustomerEntity, 'id' | 'created_at'>>): Promise<void> {",
    "async update(id: string, data: Partial<Omit<CustomerEntity, 'id' | 'created_at'>>): Promise<void> {\n    authorizationService.requirePermission('customer.edit');"
  );
  
  code = code.replace(
    "async setActiveStatus(id: string, isActive: boolean): Promise<void> {",
    "async setActiveStatus(id: string, isActive: boolean): Promise<void> {\n    authorizationService.requirePermission('customer.delete');"
  );

  fs.writeFileSync('src/database/repositories/CustomerRepository.ts', code);
}
