import {
  ReceiptDocument,
  ReceiptDocumentNode,
  TextLineNode,
  CurrencyRowNode,
  ItemRowNode,
  DividerNode,
  LogoNode,
  SpacerNode,
} from '@/types/receiptDocument';
import {
  ReceiptTemplate,
  ReceiptWidth,
  ReceiptBlock,
  DividerStyle,
  PlaceholderData,
} from '@/types/receiptTemplate';
import { ReceiptData } from './ReceiptService';
import { convertLegacyConfigToTemplate, substitutePlaceholders } from './templateOperations';
import { formatCurrency } from '@/utils/currency';
import { formatHeaderRow } from './receiptLayoutHelper';

export interface CompileReceiptOptions {
  targetWidth?: ReceiptWidth;
}

export interface ResolveReceiptWidthOptions {
  explicitWidth?: ReceiptWidth;
  templateWidth?: ReceiptWidth;
  configWidth?: ReceiptWidth;
  printerWidth?: ReceiptWidth;
}

/**
 * Resolves the effective paper width for a receipt operation following strict precedence:
 * 1. Explicit override passed directly for this operation (e.g. modal segmented button)
 * 2. Saved active template or draft template width
 * 3. Legacy receipt configuration or physical printer configuration fallback
 * 4. Ultimate default: '80mm'
 */
export function resolveReceiptPaperWidth(options: ResolveReceiptWidthOptions): ReceiptWidth {
  if (options.explicitWidth === '58mm' || options.explicitWidth === '80mm') {
    return options.explicitWidth;
  }
  if (options.templateWidth === '58mm' || options.templateWidth === '80mm') {
    return options.templateWidth;
  }
  if (options.configWidth === '80mm' || options.printerWidth === '80mm') {
    return '80mm';
  }
  if (options.configWidth === '58mm' || options.printerWidth === '58mm') {
    return '58mm';
  }
  return '80mm';
}

/**
 * Maps payment method identifiers to readable Indonesian labels.
 */
export function formatPaymentMethodLabel(method: string): string {
  const normalized = (method || '').toLowerCase().trim();
  switch (normalized) {
    case 'cash':
    case 'tunai':
      return 'Tunai';
    case 'qris':
      return 'QRIS';
    case 'debit':
    case 'card':
      return 'Kartu Debit';
    case 'transfer':
    case 'bank_transfer':
      return 'Transfer Bank';
    default:
      return method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Pembayaran';
  }
}

/**
 * Maps divider styles to their fill characters.
 */
export function getDividerChar(style: DividerStyle): string {
  switch (style) {
    case 'double':
      return '=';
    case 'dashed':
      return '-';
    case 'dotted':
      return '.';
    case 'single':
    default:
      return '-';
  }
}

/**
 * Builds placeholder data mapping from ReceiptData.
 */
export function buildPlaceholderData(data: ReceiptData): PlaceholderData {
  const paymentMethods = (data.payments || [])
    .map((p) => formatPaymentMethodLabel(p.method))
    .filter(Boolean)
    .join(', ');

  return {
    store_name: data.store?.name || '',
    store_phone: data.store?.phone || '',
    store_address: data.store?.address || '',
    trx_number: data.transaction?.transactionNumber || '',
    date: data.transaction?.date || '',
    time: data.transaction?.time || '',
    cashier_name: data.transaction?.cashierName || '',
    customer_name: data.transaction?.customerName || '-',
    subtotal: formatCurrency(data.transaction?.subtotal || 0),
    discount: formatCurrency(data.transaction?.discount || 0),
    total: formatCurrency(data.transaction?.total || 0),
    payment_method: paymentMethods || '-',
  };
}

/**
 * Compiles a single ReceiptBlock into zero, one, or more ReceiptDocumentNodes.
 */
export function compileBlockToNodes(
  block: ReceiptBlock,
  data: ReceiptData,
  columns: number,
  placeholderData: PlaceholderData
): ReceiptDocumentNode[] {
  if (!block.visible) {
    return [];
  }

  const nodes: ReceiptDocumentNode[] = [];
  const sourceId = block.id;

  switch (block.type) {
    case 'logo': {
      const uri = data.config?.logo;
      nodes.push({
        type: 'logo',
        sourceBlockId: sourceId,
        uri,
        align: block.align || 'center',
        maxWidth: block.maxWidth,
        hasRaster: Boolean(data.logoRaster),
      } as LogoNode);
      break;
    }

    case 'store_header': {
      const align = block.align || 'center';
      if (block.showStoreName !== false && data.store?.name) {
        nodes.push({
          type: 'text_line',
          sourceBlockId: sourceId,
          text: data.store.name,
          align,
          bold: true,
          size: 'normal',
        } as TextLineNode);
      }
      if (block.showStoreAddress !== false && data.store?.address) {
        nodes.push({
          type: 'text_line',
          sourceBlockId: sourceId,
          text: data.store.address,
          align,
          size: 'small',
        } as TextLineNode);
      }
      if (block.showStorePhone !== false && data.store?.phone) {
        nodes.push({
          type: 'text_line',
          sourceBlockId: sourceId,
          text: data.store.phone,
          align,
          size: 'small',
        } as TextLineNode);
      }
      break;
    }

    case 'custom_text': {
      const substituted = substitutePlaceholders(block.text, placeholderData);
      if (substituted && substituted.trim().length > 0) {
        const lines = substituted.split('\n');
        for (const line of lines) {
          nodes.push({
            type: 'text_line',
            sourceBlockId: sourceId,
            text: line,
            align: block.align || 'left',
            bold: Boolean(block.bold),
            size: block.fontSize || 'normal',
          } as TextLineNode);
        }
      }
      break;
    }

    case 'divider': {
      nodes.push({
        type: 'divider',
        sourceBlockId: sourceId,
        style: block.style || 'single',
        char: getDividerChar(block.style || 'single'),
        columns,
        spacing: block.spacing || 'none',
      } as DividerNode);
      break;
    }

    case 'transaction_meta': {
      // 1. No. Trx
      if (block.showTransactionNumber !== false && data.transaction?.transactionNumber) {
        const trxLines = formatHeaderRow('No. Trx', data.transaction.transactionNumber, columns, {
          labelWidth: 8,
        });
        for (const line of trxLines) {
          nodes.push({
            type: 'text_line',
            sourceBlockId: sourceId,
            text: line,
            align: 'left',
          } as TextLineNode);
        }
      }

      // 2. Tgl (left-aligned with other values)
      if (block.showDateTime !== false && (data.transaction?.date || data.transaction?.time)) {
        const dateTimeStr = data.transaction?.date
          ? (data.transaction?.time ? `${data.transaction.date} ${data.transaction.time}` : data.transaction.date)
          : (data.transaction?.time || '');
        if (dateTimeStr) {
          const dateLines = formatHeaderRow('Tgl', dateTimeStr, columns, {
            labelWidth: 8,
          });
          for (const line of dateLines) {
            nodes.push({
              type: 'text_line',
              sourceBlockId: sourceId,
              text: line,
              align: 'left',
            } as TextLineNode);
          }
        }
      }

      // 3. Kasir
      if (block.showCashier !== false && data.transaction?.cashierName) {
        const cashierLines = formatHeaderRow('Kasir', data.transaction.cashierName, columns, {
          labelWidth: 8,
        });
        for (const line of cashierLines) {
          nodes.push({
            type: 'text_line',
            sourceBlockId: sourceId,
            text: line,
            align: 'left',
          } as TextLineNode);
        }
      }
      break;
    }

    case 'customer_info': {
      // 4. Plg (Customer)
      if (data.transaction?.customerName && data.transaction.customerName.trim().length > 0) {
        const label = block.label && block.label !== 'Pelanggan' ? block.label : 'Plg';
        const customerLines = formatHeaderRow(label, data.transaction.customerName, columns, {
          labelWidth: 8,
        });
        for (const line of customerLines) {
          nodes.push({
            type: 'text_line',
            sourceBlockId: sourceId,
            text: line,
            align: 'left',
          } as TextLineNode);
        }
      }
      break;
    }

    case 'item_list': {
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          nodes.push({
            type: 'item_row',
            sourceBlockId: sourceId,
            name: item.name || '',
            sku: item.sku || null,
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            subtotal: item.subtotal || 0,
            showSku: block.showSku ?? true,
            showUnitPrice: block.showUnitPrice ?? true,
            compact: Boolean(block.compact),
          } as ItemRowNode);
        }
      }
      break;
    }

    case 'subtotal': {
      nodes.push({
        type: 'currency_row',
        sourceBlockId: sourceId,
        label: block.label || 'Subtotal',
        currency: 'Rp.',
        amount: data.transaction?.subtotal || 0,
      } as CurrencyRowNode);
      break;
    }

    case 'discount': {
      const discount = data.transaction?.discount ?? 0;
      if (discount > 0) {
        nodes.push({
          type: 'currency_row',
          sourceBlockId: sourceId,
          label: block.label || 'Diskon',
          currency: 'Rp.',
          amount: discount,
          isNegative: true,
        } as CurrencyRowNode);
      } else if (data.transaction?.discount !== undefined) {
        nodes.push({
          type: 'currency_row',
          sourceBlockId: sourceId,
          label: block.label || 'Diskon',
          currency: 'Rp.',
          amount: 0,
        } as CurrencyRowNode);
      }
      break;
    }

    case 'tax': {
      // Calculate tax if present or difference between total and subtotal-discount
      const subtotal = data.transaction?.subtotal || 0;
      const discount = data.transaction?.discount || 0;
      const total = data.transaction?.total || 0;
      const computedTax = Math.max(0, total - (subtotal - discount));

      if (computedTax > 0) {
        nodes.push({
          type: 'currency_row',
          sourceBlockId: sourceId,
          label: block.label || 'Pajak',
          currency: 'Rp.',
          amount: computedTax,
        } as CurrencyRowNode);
      }
      break;
    }

    case 'total': {
      nodes.push({
        type: 'currency_row',
        sourceBlockId: sourceId,
        label: block.label || 'TOTAL',
        currency: 'Rp.',
        amount: data.transaction?.total || 0,
        bold: block.bold ?? true,
        size: block.fontSize || 'large',
      } as CurrencyRowNode);
      break;
    }

    case 'payments': {
      if (Array.isArray(data.payments)) {
        for (const p of data.payments) {
          const methodLabel = formatPaymentMethodLabel(p.method);
          nodes.push({
            type: 'currency_row',
            sourceBlockId: sourceId,
            label: methodLabel,
            currency: 'Rp.',
            amount: p.amount || 0,
          } as CurrencyRowNode);

          if (p.receivedAmount > 0 && p.receivedAmount !== p.amount) {
            nodes.push({
              type: 'currency_row',
              sourceBlockId: sourceId,
              label: 'Tunai Diterima',
              currency: 'Rp.',
              amount: p.receivedAmount,
            } as CurrencyRowNode);
          }

          if (block.showReference && p.referenceNumber && p.referenceNumber.trim().length > 0) {
            nodes.push({
              type: 'text_line',
              sourceBlockId: sourceId,
              text: `Ref: ${p.referenceNumber}`,
              align: 'left',
              size: 'small',
            } as TextLineNode);
          }
        }
      }
      break;
    }

    case 'change': {
      const totalChange = (data.payments || []).reduce(
        (acc, p) => acc + (p.changeAmount || 0),
        0
      );
      if (totalChange > 0) {
        nodes.push({
          type: 'currency_row',
          sourceBlockId: sourceId,
          label: block.label || 'Kembalian',
          currency: 'Rp.',
          amount: totalChange,
        } as CurrencyRowNode);
      }
      break;
    }

    case 'footer_text': {
      const substituted = substitutePlaceholders(block.text, placeholderData);
      if (substituted && substituted.trim().length > 0) {
        const lines = substituted.split('\n');
        for (const line of lines) {
          nodes.push({
            type: 'text_line',
            sourceBlockId: sourceId,
            text: line,
            align: block.align || 'center',
            size: 'small',
          } as TextLineNode);
        }
      }
      break;
    }

    case 'spacer': {
      const lines = Math.max(1, Math.min(10, Math.floor(block.lines || 1)));
      nodes.push({
        type: 'spacer',
        sourceBlockId: sourceId,
        lines,
      } as SpacerNode);
      break;
    }

    default:
      // Unknown or unhandled block type: silently ignored
      break;
  }

  return nodes;
}

/**
 * Pure compiler that transforms a validated ReceiptTemplate and ReceiptData into a renderer-neutral ReceiptDocument.
 */
export function compileReceiptDocument(
  template: ReceiptTemplate | null | undefined,
  data: ReceiptData,
  options?: CompileReceiptOptions
): ReceiptDocument {
  // Safe fallback if template is missing or malformed
  const activeTemplate =
    template && Array.isArray(template.blocks) && template.blocks.length > 0
      ? template
      : convertLegacyConfigToTemplate(data?.config);

  const paperWidth: ReceiptWidth = resolveReceiptPaperWidth({
    explicitWidth: options?.targetWidth || data?.targetWidth,
    templateWidth: activeTemplate?.paperWidth,
    configWidth: data?.config?.receiptWidth,
  });

  const columns = paperWidth === '58mm' ? 32 : 48;
  const placeholderData = buildPlaceholderData(data);

  const nodes: ReceiptDocumentNode[] = [];

  for (const block of activeTemplate.blocks) {
    const blockNodes = compileBlockToNodes(block, data, columns, placeholderData);
    nodes.push(...blockNodes);
  }

  return {
    metadata: {
      templateId: activeTemplate.id,
      templateName: activeTemplate.name,
      paperWidth,
      columns,
      compiledAt: new Date().toISOString(),
      transactionNumber: data?.transaction?.transactionNumber,
    },
    nodes,
  };
}

/**
 * Compiles a ReceiptDocument directly from legacy ReceiptConfig and ReceiptData
 * without requiring a stored ReceiptTemplate.
 */
export function compileLegacyReceiptDocument(
  data: ReceiptData,
  options?: CompileReceiptOptions
): ReceiptDocument {
  const synthesizedTemplate = convertLegacyConfigToTemplate(data.config);
  return compileReceiptDocument(synthesizedTemplate, data, options);
}
