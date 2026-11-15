import { ReceiptWidth, TextAlignment, FontSize, DividerStyle, SpacingSize } from './receiptTemplate';

export type ReceiptDocumentNodeType =
  | 'text_line'
  | 'key_value_row'
  | 'currency_row'
  | 'item_row'
  | 'divider'
  | 'logo'
  | 'spacer';

export interface BaseReceiptDocumentNode {
  type: ReceiptDocumentNodeType;
  sourceBlockId?: string;
}

export interface TextLineNode extends BaseReceiptDocumentNode {
  type: 'text_line';
  text: string;
  align: TextAlignment;
  bold?: boolean;
  size?: FontSize;
}

export interface KeyValueRowNode extends BaseReceiptDocumentNode {
  type: 'key_value_row';
  key: string;
  value: string;
  alignValue?: 'left' | 'right';
}

export interface CurrencyRowNode extends BaseReceiptDocumentNode {
  type: 'currency_row';
  label: string;
  currency: string; // e.g. 'Rp.'
  amount: number;   // Raw numeric value preserved for deterministic formatting
  isNegative?: boolean;
  bold?: boolean;
  size?: 'normal' | 'large';
  prefix?: string;
}

export interface ItemRowNode extends BaseReceiptDocumentNode {
  type: 'item_row';
  name: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  showSku?: boolean;
  showUnitPrice?: boolean;
  compact?: boolean;
}

export interface DividerNode extends BaseReceiptDocumentNode {
  type: 'divider';
  style: DividerStyle;
  char: string;
  columns: number; // 32 for 58mm, 48 for 80mm
  spacing: SpacingSize;
}

export interface LogoNode extends BaseReceiptDocumentNode {
  type: 'logo';
  uri?: string;
  align: TextAlignment;
  maxWidth?: number;
  hasRaster?: boolean;
}

export interface SpacerNode extends BaseReceiptDocumentNode {
  type: 'spacer';
  lines: number; // 1 to 10
}

export type ReceiptDocumentNode =
  | TextLineNode
  | KeyValueRowNode
  | CurrencyRowNode
  | ItemRowNode
  | DividerNode
  | LogoNode
  | SpacerNode;

export interface ReceiptDocumentMetadata {
  templateId?: string;
  templateName?: string;
  paperWidth: ReceiptWidth;
  columns: number;
  compiledAt: string;
  transactionNumber?: string;
}

export interface ReceiptDocument {
  metadata: ReceiptDocumentMetadata;
  nodes: ReceiptDocumentNode[];
}
