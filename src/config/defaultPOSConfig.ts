import { POSConfig } from '@/types/pos';

export const defaultPOSConfig: POSConfig = {
  layout: 'grid',
  categoryNavigation: 'top_tabs',
  productDisplay: {
    showImages: true,
    showPrices: true,
    showStock: true,
    showSKU: true,
    quickAdd: true,
  },
  barcode: {
    enabled: true,
  },
  tabletLayout: {
    splitView: true,
    cartPosition: 'right',
  },
};
