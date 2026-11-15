const fs = require('fs');
let code = fs.readFileSync('src/services/product/ProductService.ts', 'utf-8');

if (!code.includes("authorizationService")) {
  code = code.replace(
    "import { ProductEntity, MovementType } from '../../database/types';",
    "import { ProductEntity, MovementType } from '../../database/types';\nimport { authorizationService } from '../auth/AuthorizationService';"
  );
  
  code = code.replace(
    "async createProduct(input: CreateProductInput): Promise<ProductEntity> {",
    "async createProduct(input: CreateProductInput): Promise<ProductEntity> {\n    authorizationService.requirePermission('product.create');"
  );
  
  code = code.replace(
    "async updateProduct(id: string, input: UpdateProductInput): Promise<void> {",
    "async updateProduct(id: string, input: UpdateProductInput): Promise<void> {\n    authorizationService.requirePermission('product.edit');"
  );
  
  code = code.replace(
    "async adjustStock(input: AdjustStockInput): Promise<void> {",
    "async adjustStock(input: AdjustStockInput): Promise<void> {\n    authorizationService.requirePermission('product.stock_adjust');"
  );
  
  code = code.replace(
    "async setProductActiveStatus(id: string, isActive: boolean): Promise<void> {",
    "async setProductActiveStatus(id: string, isActive: boolean): Promise<void> {\n    authorizationService.requirePermission('product.edit');"
  );
  
  fs.writeFileSync('src/services/product/ProductService.ts', code);
}
