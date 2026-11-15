import { isDemoSeeded } from './seedUtils';
import { seedDemoCategories } from './seedCategories';
import { seedDemoProducts } from './seedProducts';
import { seedDemoCustomers } from './seedCustomers';
import { seedDemoTransactions } from './seedTransactions';
// import { seedDemoExpenses } from './seedExpenses';

export interface DemoSeedSummary {
  success: boolean;
  message: string;
  counts?: {
    categories: number;
    products: number;
    customers: number;
    transactions: number;
    // expenses: number;
  };
}

export async function runDemoSeed(): Promise<DemoSeedSummary> {
  try {
    const seeded = await isDemoSeeded();
    if (seeded) {
      return {
        success: false,
        message: 'Data demo sudah ada. Tidak dapat menambahkan ulang agar tidak duplikat.'
      };
    }

    // Must be in dependency order
    const categories = await seedDemoCategories();
    const customers = await seedDemoCustomers();
    const products = await seedDemoProducts();
    const transactions = await seedDemoTransactions();
    // const expenses = 0;

    return {
      success: true,
      message: 'Demo Seed Complete',
      counts: {
        categories,
        products,
        customers,
        transactions,
        // expenses,
      }
    };
  } catch (error: any) {
    console.error('[DemoSeed] Failed:', error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}
