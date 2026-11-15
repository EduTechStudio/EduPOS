import {
  ReceiptBlock,
  ReceiptBlockType,
  ReceiptTemplate,
  ReceiptTemplatesConfiguration,
  ReceiptWidth,
  TextAlignment,
  FontSize,
  SpacingSize,
  DividerStyle,
  TEMPLATE_SCHEMA_VERSION,
  ALLOWED_PLACEHOLDER_TOKENS,
  PlaceholderData,
} from '@/types/receiptTemplate';
import { ReceiptConfig } from '@/types/receipt';
import { defaultReceiptConfig } from '@/config/defaultReceiptConfig';

export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${randomPart}`;
}

const VALID_BLOCK_TYPES = new Set<ReceiptBlockType>([
  'logo',
  'store_header',
  'custom_text',
  'divider',
  'transaction_meta',
  'customer_info',
  'item_list',
  'subtotal',
  'discount',
  'tax',
  'total',
  'payments',
  'change',
  'footer_text',
  'spacer',
]);

const VALID_ALIGNMENTS = new Set<TextAlignment>(['left', 'center', 'right']);
const VALID_FONT_SIZES = new Set<FontSize>(['small', 'normal', 'large']);
const VALID_SPACINGS = new Set<SpacingSize>(['none', 'small', 'medium', 'large']);
const VALID_DIVIDER_STYLES = new Set<DividerStyle>(['single', 'double', 'dashed', 'dotted']);
const VALID_PAPER_WIDTHS = new Set<ReceiptWidth>(['58mm', '80mm']);

const MAX_TEXT_LENGTH = 1000;

export function sanitizeText(val: any, defaultVal = '', maxLen = MAX_TEXT_LENGTH): string {
  if (typeof val !== 'string') return defaultVal;
  return val.slice(0, maxLen);
}

export function sanitizeAlignment(val: any, defaultVal: TextAlignment = 'left'): TextAlignment {
  return VALID_ALIGNMENTS.has(val) ? val : defaultVal;
}

export function sanitizeFontSize(val: any, defaultVal: FontSize = 'normal'): FontSize {
  return VALID_FONT_SIZES.has(val) ? val : defaultVal;
}

export function sanitizeSpacing(val: any, defaultVal: SpacingSize = 'none'): SpacingSize {
  return VALID_SPACINGS.has(val) ? val : defaultVal;
}

export function sanitizeDividerStyle(val: any, defaultVal: DividerStyle = 'single'): DividerStyle {
  return VALID_DIVIDER_STYLES.has(val) ? val : defaultVal;
}

export function sanitizePaperWidth(val: any, defaultVal: ReceiptWidth = '80mm'): ReceiptWidth {
  return VALID_PAPER_WIDTHS.has(val) ? val : defaultVal;
}

/**
 * Creates a default list of receipt blocks matching standard POS flow.
 */
export function createDefaultBlocks(overrides?: Partial<ReceiptConfig>): ReceiptBlock[] {
  const footerText = overrides?.footerText || defaultReceiptConfig.footerText;

  return [
    {
      id: generateId('blk_logo'),
      type: 'logo',
      visible: overrides?.showLogo ?? defaultReceiptConfig.showLogo ?? true,
      align: 'center',
    },
    {
      id: generateId('blk_header'),
      type: 'store_header',
      visible: overrides?.showHeader ?? defaultReceiptConfig.showHeader ?? true,
      showStoreName: true,
      showStoreAddress: overrides?.showStoreAddress ?? defaultReceiptConfig.showStoreAddress ?? true,
      showStorePhone: overrides?.showStorePhone ?? defaultReceiptConfig.showStorePhone ?? true,
      align: 'center',
    },
    {
      id: generateId('blk_div1'),
      type: 'divider',
      visible: true,
      style: 'single',
      spacing: 'none',
    },
    {
      id: generateId('blk_meta'),
      type: 'transaction_meta',
      visible: true,
      showTransactionNumber: overrides?.showTransactionNumber ?? defaultReceiptConfig.showTransactionNumber ?? true,
      showDateTime: overrides?.showDateTime ?? defaultReceiptConfig.showDateTime ?? true,
      showCashier: overrides?.showCashier ?? defaultReceiptConfig.showCashier ?? true,
    },
    {
      id: generateId('blk_cust'),
      type: 'customer_info',
      visible: overrides?.showCustomer ?? defaultReceiptConfig.showCustomer ?? true,
      label: 'Plg',
    },
    {
      id: generateId('blk_div2'),
      type: 'divider',
      visible: true,
      style: 'dashed',
      spacing: 'none',
    },
    {
      id: generateId('blk_items'),
      type: 'item_list',
      visible: true,
      showSku: true,
      showUnitPrice: true,
      compact: false,
    },
    {
      id: generateId('blk_div3'),
      type: 'divider',
      visible: true,
      style: 'single',
      spacing: 'none',
    },
    {
      id: generateId('blk_subtotal'),
      type: 'subtotal',
      visible: overrides?.showSubtotal ?? defaultReceiptConfig.showSubtotal ?? true,
      label: 'Subtotal',
    },
    {
      id: generateId('blk_discount'),
      type: 'discount',
      visible: overrides?.showDiscount ?? defaultReceiptConfig.showDiscount ?? true,
      label: 'Diskon',
    },
    {
      id: generateId('blk_tax'),
      type: 'tax',
      visible: overrides?.showTax ?? defaultReceiptConfig.showTax ?? true,
      label: 'Pajak',
    },
    {
      id: generateId('blk_total'),
      type: 'total',
      visible: overrides?.showTotal ?? defaultReceiptConfig.showTotal ?? true,
      label: 'TOTAL',
      bold: true,
      fontSize: 'large',
    },
    {
      id: generateId('blk_div4'),
      type: 'divider',
      visible: true,
      style: 'dashed',
      spacing: 'none',
    },
    {
      id: generateId('blk_payments'),
      type: 'payments',
      visible: overrides?.showPaymentMethod ?? defaultReceiptConfig.showPaymentMethod ?? true,
      showReference: true,
    },
    {
      id: generateId('blk_change'),
      type: 'change',
      visible: overrides?.showChange ?? defaultReceiptConfig.showChange ?? true,
      label: 'Kembalian',
    },
    {
      id: generateId('blk_div5'),
      type: 'divider',
      visible: true,
      style: 'single',
      spacing: 'none',
    },
    {
      id: generateId('blk_footer'),
      type: 'footer_text',
      visible: overrides?.showFooter ?? defaultReceiptConfig.showFooter ?? true,
      text: footerText,
      align: 'center',
    },
  ];
}

/**
 * Creates a brand new default receipt template.
 */
export function createDefaultTemplate(
  paperWidth?: ReceiptWidth,
  overrides?: Partial<ReceiptConfig>
): ReceiptTemplate {
  const now = new Date().toISOString();
  const width = sanitizePaperWidth(paperWidth || overrides?.receiptWidth || defaultReceiptConfig.receiptWidth);

  return {
    id: 'default_standard',
    name: 'Standard Receipt',
    paperWidth: width,
    isDefault: true,
    blocks: createDefaultBlocks(overrides),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Converts legacy ReceiptConfig (and optional store profile) into a modern ReceiptTemplate
 * without altering or overwriting existing SQLite settings.
 */
export function convertLegacyConfigToTemplate(
  legacyConfig?: Partial<ReceiptConfig>,
  _storeProfile?: any
): ReceiptTemplate {
  const merged = { ...defaultReceiptConfig, ...legacyConfig };
  return createDefaultTemplate(merged.receiptWidth, merged);
}

/**
 * Validates and sanitizes a single ReceiptBlock.
 */
export function validateReceiptBlock(block: any): { valid: boolean; error?: string; sanitized?: ReceiptBlock } {
  if (!block || typeof block !== 'object') {
    return { valid: false, error: 'Block must be an object' };
  }

  if (typeof block.id !== 'string' || !block.id.trim()) {
    return { valid: false, error: 'Block ID must be a non-empty string' };
  }

  if (!VALID_BLOCK_TYPES.has(block.type)) {
    return { valid: false, error: `Invalid block type: ${block.type}` };
  }

  const base: { id: string; type: ReceiptBlockType; visible: boolean } = {
    id: block.id.trim(),
    type: block.type,
    visible: typeof block.visible === 'boolean' ? block.visible : true,
  };

  switch (block.type) {
    case 'logo':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'logo',
          align: sanitizeAlignment(block.align, 'center'),
          maxWidth: typeof block.maxWidth === 'number' && block.maxWidth > 0 ? block.maxWidth : undefined,
        },
      };

    case 'store_header':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'store_header',
          showStoreName: typeof block.showStoreName === 'boolean' ? block.showStoreName : true,
          showStoreAddress: typeof block.showStoreAddress === 'boolean' ? block.showStoreAddress : true,
          showStorePhone: typeof block.showStorePhone === 'boolean' ? block.showStorePhone : true,
          align: sanitizeAlignment(block.align, 'center'),
        },
      };

    case 'custom_text':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'custom_text',
          text: sanitizeText(block.text, ''),
          align: sanitizeAlignment(block.align, 'left'),
          fontSize: sanitizeFontSize(block.fontSize, 'normal'),
          bold: Boolean(block.bold),
        },
      };

    case 'divider':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'divider',
          style: sanitizeDividerStyle(block.style, 'single'),
          spacing: sanitizeSpacing(block.spacing, 'none'),
        },
      };

    case 'transaction_meta':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'transaction_meta',
          showTransactionNumber: typeof block.showTransactionNumber === 'boolean' ? block.showTransactionNumber : true,
          showDateTime: typeof block.showDateTime === 'boolean' ? block.showDateTime : true,
          showCashier: typeof block.showCashier === 'boolean' ? block.showCashier : true,
        },
      };

    case 'customer_info':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'customer_info',
          label: sanitizeText(block.label, 'Pelanggan', 50),
        },
      };

    case 'item_list':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'item_list',
          showSku: typeof block.showSku === 'boolean' ? block.showSku : true,
          showUnitPrice: typeof block.showUnitPrice === 'boolean' ? block.showUnitPrice : true,
          compact: Boolean(block.compact),
        },
      };

    case 'subtotal':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'subtotal',
          label: sanitizeText(block.label, 'Subtotal', 50),
        },
      };

    case 'discount':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'discount',
          label: sanitizeText(block.label, 'Diskon', 50),
        },
      };

    case 'tax':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'tax',
          label: sanitizeText(block.label, 'Pajak', 50),
        },
      };

    case 'total':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'total',
          label: sanitizeText(block.label, 'TOTAL', 50),
          bold: typeof block.bold === 'boolean' ? block.bold : true,
          fontSize: block.fontSize === 'normal' ? 'normal' : 'large',
        },
      };

    case 'payments':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'payments',
          showReference: typeof block.showReference === 'boolean' ? block.showReference : true,
        },
      };

    case 'change':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'change',
          label: sanitizeText(block.label, 'Kembalian', 50),
        },
      };

    case 'footer_text':
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'footer_text',
          text: sanitizeText(block.text, ''),
          align: sanitizeAlignment(block.align, 'center'),
        },
      };

    case 'spacer': {
      const rawLines = typeof block.lines === 'number' ? block.lines : 1;
      const lines = Math.max(1, Math.min(10, Math.floor(rawLines)));
      return {
        valid: true,
        sanitized: {
          ...base,
          type: 'spacer',
          lines,
        },
      };
    }

    default:
      return { valid: false, error: `Unhandled block type` };
  }
}

/**
 * Validates and sanitizes a complete ReceiptTemplate.
 */
export function validateReceiptTemplate(template: any): {
  valid: boolean;
  errors: string[];
  sanitized?: ReceiptTemplate;
} {
  const errors: string[] = [];

  if (!template || typeof template !== 'object') {
    return { valid: false, errors: ['Template must be an object'] };
  }

  if (typeof template.id !== 'string' || !template.id.trim()) {
    errors.push('Template ID must be a non-empty string');
  }

  const name = sanitizeText(template.name, 'Untitled Template', 100);
  if (!name.trim()) {
    errors.push('Template name cannot be empty');
  }

  const paperWidth = sanitizePaperWidth(template.paperWidth);

  if (!Array.isArray(template.blocks)) {
    errors.push('Template blocks must be an array');
  }

  const sanitizedBlocks: ReceiptBlock[] = [];
  const seenBlockIds = new Set<string>();

  if (Array.isArray(template.blocks)) {
    for (let i = 0; i < template.blocks.length; i++) {
      const res = validateReceiptBlock(template.blocks[i]);
      if (!res.valid || !res.sanitized) {
        errors.push(`Block [${i}]: ${res.error || 'Invalid block'}`);
      } else {
        let block = res.sanitized;
        if (seenBlockIds.has(block.id)) {
          // De-duplicate duplicate block ID
          block = { ...block, id: generateId(`blk_${block.type}`) };
        }
        seenBlockIds.add(block.id);
        sanitizedBlocks.push(block);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const now = new Date().toISOString();
  return {
    valid: true,
    errors: [],
    sanitized: {
      id: template.id.trim(),
      name,
      paperWidth,
      isDefault: Boolean(template.isDefault),
      blocks: sanitizedBlocks,
      createdAt: typeof template.createdAt === 'string' ? template.createdAt : now,
      updatedAt: typeof template.updatedAt === 'string' ? template.updatedAt : now,
    },
  };
}

/**
 * Validates and sanitizes a complete ReceiptTemplatesConfiguration.
 */
export function validateTemplatesConfiguration(config: any): {
  valid: boolean;
  errors: string[];
  sanitized?: ReceiptTemplatesConfiguration;
} {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be an object'] };
  }

  if (config.version !== TEMPLATE_SCHEMA_VERSION) {
    errors.push(`Unsupported template schema version: ${config.version}`);
  }

  if (!Array.isArray(config.templates) || config.templates.length === 0) {
    errors.push('Templates array must not be empty');
  }

  const sanitizedTemplates: ReceiptTemplate[] = [];
  const seenTemplateIds = new Set<string>();

  if (Array.isArray(config.templates)) {
    for (let i = 0; i < config.templates.length; i++) {
      const res = validateReceiptTemplate(config.templates[i]);
      if (!res.valid || !res.sanitized) {
        errors.push(`Template [${i}]: ${res.errors.join('; ')}`);
      } else {
        let tmpl = res.sanitized;
        if (seenTemplateIds.has(tmpl.id)) {
          tmpl = { ...tmpl, id: generateId('tmpl') };
        }
        seenTemplateIds.add(tmpl.id);
        sanitizedTemplates.push(tmpl);
      }
    }
  }

  let activeId = typeof config.activeTemplateId === 'string' ? config.activeTemplateId.trim() : '';
  if (!seenTemplateIds.has(activeId) && sanitizedTemplates.length > 0) {
    // Fall back to first available template ID
    activeId = sanitizedTemplates[0].id;
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const now = new Date().toISOString();
  return {
    valid: true,
    errors: [],
    sanitized: {
      version: TEMPLATE_SCHEMA_VERSION,
      activeTemplateId: activeId,
      templates: sanitizedTemplates,
      updatedAt: typeof config.updatedAt === 'string' ? config.updatedAt : now,
    },
  };
}

/**
 * Creates initial configuration container with a default template.
 */
export function createInitialTemplatesConfig(defaultTemplate?: ReceiptTemplate): ReceiptTemplatesConfiguration {
  const def = defaultTemplate || createDefaultTemplate();
  const now = new Date().toISOString();

  return {
    version: TEMPLATE_SCHEMA_VERSION,
    activeTemplateId: def.id,
    templates: [def],
    updatedAt: now,
  };
}

/**
 * Duplicates an existing template, generating a new unique template ID
 * and completely new unique IDs for every block within it.
 */
export function duplicateTemplate(source: ReceiptTemplate, newName?: string): ReceiptTemplate {
  const now = new Date().toISOString();
  const name = newName?.trim() || `${source.name} (Salinan)`;

  const newBlocks = source.blocks.map((block) => ({
    ...block,
    id: generateId(`blk_${block.type}`),
  }));

  return {
    ...source,
    id: generateId('tmpl'),
    name,
    isDefault: false,
    blocks: newBlocks,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Pure block reordering.
 */
export function reorderBlocks(
  template: ReceiptTemplate,
  fromIndex: number,
  toIndex: number
): ReceiptTemplate {
  if (
    fromIndex < 0 ||
    fromIndex >= template.blocks.length ||
    toIndex < 0 ||
    toIndex >= template.blocks.length ||
    fromIndex === toIndex
  ) {
    return template;
  }

  const updatedBlocks = [...template.blocks];
  const [moved] = updatedBlocks.splice(fromIndex, 1);
  updatedBlocks.splice(toIndex, 0, moved);

  return {
    ...template,
    blocks: updatedBlocks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pure block addition.
 */
export function addBlock(
  template: ReceiptTemplate,
  block: ReceiptBlock,
  targetIndex?: number
): ReceiptTemplate {
  const validation = validateReceiptBlock(block);
  const blockToAdd = validation.sanitized || block;

  const updatedBlocks = [...template.blocks];
  if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= updatedBlocks.length) {
    updatedBlocks.splice(targetIndex, 0, blockToAdd);
  } else {
    updatedBlocks.push(blockToAdd);
  }

  return {
    ...template,
    blocks: updatedBlocks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pure block removal.
 */
export function removeBlock(template: ReceiptTemplate, blockId: string): ReceiptTemplate {
  const updatedBlocks = template.blocks.filter((b) => b.id !== blockId);
  return {
    ...template,
    blocks: updatedBlocks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pure block property update.
 */
export function updateBlock(
  template: ReceiptTemplate,
  blockId: string,
  updates: Partial<ReceiptBlock>
): ReceiptTemplate {
  const updatedBlocks = template.blocks.map((b) => {
    if (b.id !== blockId) return b;
    const merged = { ...b, ...updates, id: b.id, type: b.type };
    const validation = validateReceiptBlock(merged);
    return validation.sanitized || b;
  });

  return {
    ...template,
    blocks: updatedBlocks,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pure template renaming.
 */
export function renameTemplate(template: ReceiptTemplate, newName: string): ReceiptTemplate {
  return {
    ...template,
    name: sanitizeText(newName, template.name, 100),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Substitutes allowlisted placeholder tokens in text.
 * Leaves unknown tokens untouched as literal text.
 */
export function substitutePlaceholders(text: string, data: PlaceholderData): string {
  if (!text || typeof text !== 'string') return '';

  let result = text;
  for (const token of ALLOWED_PLACEHOLDER_TOKENS) {
    // Extract key between {{ and }}
    const key = token.slice(2, -2);
    const rawVal = data ? (data[key] ?? data[token]) : undefined;
    const replacement = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
    result = result.split(token).join(replacement);
  }

  return result;
}
