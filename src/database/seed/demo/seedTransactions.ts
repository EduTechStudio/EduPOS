import { checkoutService } from '@/services/checkout/CheckoutService';
import { productRepository, customerRepository } from '@/database';
import { generateDates, getRandomInt, getRandomArrayElement } from './seedUtils';
import { DEMO_PRODUCTS } from './seedProducts';
import { DEMO_CUSTOMERS } from './seedCustomers';
import { ProductEntity, CustomerEntity } from '@/database/types';
import { CartItem } from '@/services/pos/POSService';

export async function seedDemoTransactions(): Promise<number> {
  const products = await Promise.all(DEMO_PRODUCTS.map(p => productRepository.getById(p.id)));
  const validProducts = products.filter((p): p is ProductEntity => p !== null);
  
  const customers = await Promise.all(DEMO_CUSTOMERS.map(c => customerRepository.getById(c.id)));
  const validCustomers = customers.filter((c): c is CustomerEntity => c !== null);

  if (validProducts.length === 0) return 0;

  const dates = generateDates(90);
  let successCount = 0;

  const paymentMethods: Array<'cash' | 'qris' | 'bank_transfer' | 'debit'> = ['cash', 'cash', 'cash', 'qris', 'qris', 'bank_transfer', 'debit'];

  for (const date of dates) {
    const numItems = getRandomInt(1, 6);
    const cartItems: CartItem[] = [];
    let subtotal = 0;

    for (let i = 0; i < numItems; i++) {
      const product = getRandomArrayElement(validProducts);
      const quantity = getRandomInt(1, 3);
      
      cartItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        unitPrice: product.selling_price,
        quantity,
        subtotal: product.selling_price * quantity,
        availableStock: product.current_stock,
        unit: product.unit
      });
      subtotal += product.selling_price * quantity;
    }

    let discountAmount = 0;
    const discountChance = Math.random();
    if (discountChance > 0.8) {
      discountAmount = 5000;
    } else if (discountChance > 0.6) {
      discountAmount = Math.floor(subtotal * 0.1); 
    }
    
    if (discountAmount > subtotal) discountAmount = 0;
    
    const grandTotal = subtotal - discountAmount;
    
    const method = getRandomArrayElement(paymentMethods);
    let receivedAmount = grandTotal;
    let changeAmount = 0;
    let referenceNumber = null;

    if (method === 'cash') {
      const extraChance = Math.random();
      if (extraChance > 0.5) {
        if (grandTotal < 50000) receivedAmount = 50000;
        else if (grandTotal < 100000) receivedAmount = 100000;
        else receivedAmount = Math.ceil(grandTotal / 50000) * 50000;
        
        changeAmount = receivedAmount - grandTotal;
      }
    } else {
      referenceNumber = `REF-${Math.floor(Math.random() * 1000000)}`;
    }

    const customer = Math.random() > 0.5 ? getRandomArrayElement(validCustomers) : null;

    try {
      const result = await checkoutService.processCheckout({
        items: cartItems,
        customer,
        cashierId: 'user_cashier',
        cashierName: 'Demo Cashier 1',
        subtotal,
        discountAmount,
        grandTotal,
        paymentMethod: method,
        receivedAmount,
        changeAmount,
        referenceNumber,
        createdAt: date,
      });

      if (result.success) {
        successCount++;
      }
    } catch (e) {
      console.log(`[DemoSeed] Skipping transaction: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  return successCount;
}
