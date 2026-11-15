import { BusinessTypePreset } from '@/types/businessType';
import { POSConfig } from '@/types/pos';

export const retailPresetPOSConfig: POSConfig = {
  layout: 'list',
  categoryNavigation: 'top_tabs',
  productDisplay: {
    showImages: false,
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

export const restaurantPresetPOSConfig: POSConfig = {
  layout: 'grid',
  categoryNavigation: 'sidebar',
  productDisplay: {
    showImages: true,
    showPrices: true,
    showStock: false,
    showSKU: false,
    quickAdd: true,
  },
  barcode: {
    enabled: false,
  },
  tabletLayout: {
    splitView: true,
    cartPosition: 'right',
  },
};

export const businessTypePresets: Record<string, BusinessTypePreset> = {
  retail: {
    id: 'retail',
    name: 'Retail Store',
    description: 'Optimized for barcode scanning, quick searching, SKU tracking, and fast list browsing.',
    defaultPOSConfig: retailPresetPOSConfig,
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant / Cafe',
    description: 'Optimized for visual product grids, prominent category selection, and quick item additions.',
    defaultPOSConfig: restaurantPresetPOSConfig,
  },
};
