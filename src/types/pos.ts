export type POSLayoutMode = 'grid' | 'list' | 'grid_list';

export type CategoryNavigationMode = 'top_tabs' | 'dropdown' | 'sidebar' | 'hidden';

export interface ProductDisplayConfig {
  showImages: boolean;
  showPrices: boolean;
  showStock: boolean;
  showSKU: boolean;
  quickAdd: boolean;
}

export interface BarcodeConfig {
  enabled: boolean;
}

export interface TabletLayoutConfig {
  splitView: boolean;
  cartPosition: 'right' | 'left';
}

export interface POSConfig {
  layout: POSLayoutMode;
  categoryNavigation: CategoryNavigationMode;
  productDisplay: ProductDisplayConfig;
  barcode: BarcodeConfig;
  tabletLayout: TabletLayoutConfig;
}
