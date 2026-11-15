export type ReceiptWidth = '58mm' | '80mm';
export type TextAlignment = 'left' | 'center' | 'right';
export type FontSize = 'small' | 'normal' | 'large';
export type FontWeight = 'normal' | 'bold';
export type SpacingSize = 'none' | 'small' | 'medium' | 'large';
export type DividerStyle = 'single' | 'double' | 'dashed' | 'dotted';

export type ReceiptBlockType =
  | 'logo'
  | 'store_header'
  | 'custom_text'
  | 'divider'
  | 'transaction_meta'
  | 'customer_info'
  | 'item_list'
  | 'subtotal'
  | 'discount'
  | 'tax'
  | 'total'
  | 'payments'
  | 'change'
  | 'footer_text'
  | 'spacer';

export interface BaseReceiptBlock {
  id: string;
  type: ReceiptBlockType;
  visible: boolean;
}

export interface LogoBlock extends BaseReceiptBlock {
  type: 'logo';
  align: TextAlignment;
  maxWidth?: number;
}

export interface StoreHeaderBlock extends BaseReceiptBlock {
  type: 'store_header';
  showStoreName: boolean;
  showStoreAddress: boolean;
  showStorePhone: boolean;
  align: TextAlignment;
}

export interface CustomTextBlock extends BaseReceiptBlock {
  type: 'custom_text';
  text: string;
  align: TextAlignment;
  fontSize: FontSize;
  bold: boolean;
}

export interface DividerBlock extends BaseReceiptBlock {
  type: 'divider';
  style: DividerStyle;
  spacing: SpacingSize;
}

export interface TransactionMetaBlock extends BaseReceiptBlock {
  type: 'transaction_meta';
  showTransactionNumber: boolean;
  showDateTime: boolean;
  showCashier: boolean;
}

export interface CustomerInfoBlock extends BaseReceiptBlock {
  type: 'customer_info';
  label: string;
}

export interface ItemListBlock extends BaseReceiptBlock {
  type: 'item_list';
  showSku: boolean;
  showUnitPrice: boolean;
  compact: boolean;
}

export interface SubtotalBlock extends BaseReceiptBlock {
  type: 'subtotal';
  label: string;
}

export interface DiscountBlock extends BaseReceiptBlock {
  type: 'discount';
  label: string;
}

export interface TaxBlock extends BaseReceiptBlock {
  type: 'tax';
  label: string;
}

export interface TotalBlock extends BaseReceiptBlock {
  type: 'total';
  label: string;
  bold: boolean;
  fontSize: 'normal' | 'large';
}

export interface PaymentsBlock extends BaseReceiptBlock {
  type: 'payments';
  showReference: boolean;
}

export interface ChangeBlock extends BaseReceiptBlock {
  type: 'change';
  label: string;
}

export interface FooterTextBlock extends BaseReceiptBlock {
  type: 'footer_text';
  text: string;
  align: TextAlignment;
}

export interface SpacerBlock extends BaseReceiptBlock {
  type: 'spacer';
  lines: number;
}

export type ReceiptBlock =
  | LogoBlock
  | StoreHeaderBlock
  | CustomTextBlock
  | DividerBlock
  | TransactionMetaBlock
  | CustomerInfoBlock
  | ItemListBlock
  | SubtotalBlock
  | DiscountBlock
  | TaxBlock
  | TotalBlock
  | PaymentsBlock
  | ChangeBlock
  | FooterTextBlock
  | SpacerBlock;

export interface ReceiptTemplate {
  id: string;
  name: string;
  paperWidth: ReceiptWidth;
  isDefault: boolean;
  blocks: ReceiptBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptTemplatesConfiguration {
  version: 1;
  activeTemplateId: string;
  templates: ReceiptTemplate[];
  updatedAt: string;
}

export const TEMPLATE_SCHEMA_VERSION = 1;
export const RECEIPT_TEMPLATES_STORAGE_KEY = 'receipt_templates_v1';

export const ALLOWED_PLACEHOLDER_TOKENS = [
  '{{store_name}}',
  '{{store_phone}}',
  '{{store_address}}',
  '{{trx_number}}',
  '{{date}}',
  '{{time}}',
  '{{cashier_name}}',
  '{{customer_name}}',
  '{{subtotal}}',
  '{{discount}}',
  '{{total}}',
  '{{payment_method}}',
] as const;

export type PlaceholderToken = typeof ALLOWED_PLACEHOLDER_TOKENS[number];

export interface PlaceholderData {
  store_name?: string;
  store_phone?: string;
  store_address?: string;
  trx_number?: string;
  date?: string;
  time?: string;
  cashier_name?: string;
  customer_name?: string | null;
  subtotal?: string | number;
  discount?: string | number;
  total?: string | number;
  payment_method?: string;
  [key: string]: string | number | null | undefined;
}
