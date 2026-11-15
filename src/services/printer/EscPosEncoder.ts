import { ReceiptData } from '../receipt/ReceiptService';
import { formatCurrency, formatNumber } from '../../utils/currency';
import { RasterBitmap } from './ImageRaster';
import { ReceiptDocument, ReceiptDocumentNode } from '@/types/receiptDocument';
import { formatRightAlignedCurrencyRow, formatItemRow } from '../receipt/receiptLayoutHelper';

export class EscPosEncoder {
  private buffer: number[] = [];
  private columns: number = 48;

  constructor(columns: number = 48) {
    this.columns = columns > 0 ? columns : 48;
  }

  public getColumns(): number {
    return this.columns;
  }

  public getBuffer(): number[] {
    return this.buffer;
  }

  public initialize(): this {
    this.buffer.push(0x1B, 0x40); // ESC @
    return this;
  }

  public setBold(enabled: boolean): this {
    this.buffer.push(0x1B, 0x45, enabled ? 0x01 : 0x00);
    return this;
  }

  public setAlign(align: 'left' | 'center' | 'right'): this {
    const val = align === 'left' ? 0x00 : align === 'center' ? 0x01 : 0x02;
    this.buffer.push(0x1B, 0x61, val);
    return this;
  }

  public newline(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0A);
    }
    return this;
  }

  public separator(char: string = '-'): this {
    const fillChar = char.length > 0 ? char[0] : '-';
    this.text(fillChar.repeat(this.columns));
    this.newline();
    return this;
  }

  public text(str: string): this {
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      // Map typographic punctuation to ASCII equivalents for thermal printer code pages
      if (code === 8220 || code === 8221) code = 34; // "
      else if (code === 8216 || code === 8217) code = 39; // '
      else if (code === 8211 || code === 8212) code = 45; // -
      else if (code === 8226) code = 42; // *
      else if (code === 8230) {
        this.buffer.push(46, 46, 46); // ...
        continue;
      } else if (code > 255) {
        code = 63; // ?
      }
      this.buffer.push(code);
    }
    return this;
  }

  public textLine(str: string): this {
    this.text(str);
    this.newline();
    return this;
  }

  /**
   * Word wraps a string into lines that do not exceed maxWidth characters.
   * Splits on spaces when possible; words longer than maxWidth are partitioned cleanly.
   */
  public wrapText(text: string, maxWidth: number = this.columns): string[] {
    if (!text || text.length === 0) return [''];
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (paragraph.length <= maxWidth) {
        lines.push(paragraph);
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        if (!currentLine) {
          if (word.length <= maxWidth) {
            currentLine = word;
          } else {
            // Partition single word longer than maxWidth
            for (let i = 0; i < word.length; i += maxWidth) {
              const chunk = word.substring(i, i + maxWidth);
              if (i + maxWidth >= word.length) {
                currentLine = chunk;
              } else {
                lines.push(chunk);
              }
            }
          }
        } else {
          if (currentLine.length + 1 + word.length <= maxWidth) {
            currentLine += ' ' + word;
          } else {
            lines.push(currentLine);
            if (word.length <= maxWidth) {
              currentLine = word;
            } else {
              for (let i = 0; i < word.length; i += maxWidth) {
                const chunk = word.substring(i, i + maxWidth);
                if (i + maxWidth >= word.length) {
                  currentLine = chunk;
                } else {
                  lines.push(chunk);
                }
              }
            }
          }
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * Formats a two-column row with left text and right-aligned text flush to totalWidth.
   * If left and right exceed totalWidth, wraps left text across multiple lines,
   * placing right-aligned text on the final line or an extra flush-right line.
   * Never truncates prices, amounts, or product labels.
   */
  public formatRow(col1: string, col2: string, totalWidth: number = this.columns): string {
    const left = col1 || '';
    const right = col2 || '';

    // Fast path: fits comfortably on a single line with at least one space
    if (left.length + right.length + 1 <= totalWidth) {
      const spaceCount = totalWidth - left.length - right.length;
      return left + ' '.repeat(spaceCount) + right;
    }

    // Wrapped path: wrap left so that col2 stays flush to the right edge
    const leftLines = this.wrapText(left, totalWidth);

    const lastLeftLine = leftLines[leftLines.length - 1];
    if (lastLeftLine.length + right.length + 1 <= totalWidth) {
      // Last line of left has sufficient room for right
      const spaceCount = totalWidth - lastLeftLine.length - right.length;
      leftLines[leftLines.length - 1] = lastLeftLine + ' '.repeat(spaceCount) + right;
      return leftLines.join('\n');
    } else {
      // Add right on its own flush-right line
      const rightPadding = Math.max(0, totalWidth - right.length);
      leftLines.push(' '.repeat(rightPadding) + right);
      return leftLines.join('\n');
    }
  }

  public row(col1: string, col2: string): this {
    const formatted = this.formatRow(col1, col2, this.columns);
    const lines = formatted.split('\n');
    lines.forEach(l => this.textLine(l));
    return this;
  }

  /**
   * Formats a row with item/summary label on the left, a dedicated fixed-position 'Rp.' column,
   * and numeric amount in a separate right-aligned column.
   *
   * Layout guarantee:
   * - 80 mm (48 cols): Label up to 32 cols, 'Rp. ' (4 cols at index 32..35), numeric amount (12 cols at index 36..47).
   * - 58 mm (32 cols): Label up to 18 cols, 'Rp. ' (4 cols at index 18..21), numeric amount (10 cols at index 22..31).
   * All 'Rp.' labels align vertically at the exact same column position.
   * All amounts share the exact same right edge.
   */
  public formatCurrencyRow(
    label: string,
    amount: number,
    totalWidth: number = this.columns,
    options?: { isNegative?: boolean; prefix?: string }
  ): string {
    const is80mm = totalWidth >= 48;
    const currencyWidth = is80mm ? 16 : 14;
    const amountColWidth = currencyWidth - 4; // 12 for 80mm, 10 for 58mm
    const labelWidth = totalWidth - currencyWidth; // 32 for 80mm, 18 for 58mm

    const safeAmount = Math.round(amount || 0);
    const absVal = Math.abs(safeAmount).toLocaleString('id-ID');
    const sign = (options?.isNegative || safeAmount < 0) ? '-' : (options?.prefix || '');
    const numStr = `${sign}${absVal}`;

    let paddedAmount = numStr;
    if (numStr.length < amountColWidth) {
      paddedAmount = ' '.repeat(amountColWidth - numStr.length) + numStr;
    }

    const currencyPart = `Rp. ${paddedAmount}`;

    const rawLabel = label || '';
    if (rawLabel.length <= labelWidth) {
      const padding = ' '.repeat(labelWidth - rawLabel.length);
      return `${rawLabel}${padding}${currencyPart}`;
    }

    const labelLines = this.wrapText(rawLabel, labelWidth);
    const lastLine = labelLines[labelLines.length - 1];
    const padding = ' '.repeat(Math.max(0, labelWidth - lastLine.length));
    labelLines[labelLines.length - 1] = `${lastLine}${padding}${currencyPart}`;
    return labelLines.join('\n');
  }

  public currencyRow(
    label: string,
    amount: number,
    options?: { isNegative?: boolean; prefix?: string }
  ): this {
    const formatted = this.formatCurrencyRow(label, amount, this.columns, options);
    const lines = formatted.split('\n');
    lines.forEach(l => this.textLine(l));
    return this;
  }

  /**
   * Encodes a 1-bit monochrome bitmap into ESC/POS GS v 0 raster format.
   * Automatically centers the raster image and restores left alignment.
   */
  public rasterImage(raster: RasterBitmap): this;
  public rasterImage(width: number, height: number, data: number[] | Uint8Array): this;
  public rasterImage(
    arg1: RasterBitmap | number,
    arg2?: number,
    arg3?: number[] | Uint8Array
  ): this {
    let width: number;
    let height: number;
    let data: number[] | Uint8Array;

    if (typeof arg1 === 'object') {
      width = arg1.width;
      height = arg1.height;
      data = arg1.data;
    } else {
      width = arg1;
      height = arg2 || 0;
      data = arg3 || [];
    }

    if (!width || !height || !data || data.length === 0) {
      return this;
    }

    // Horizontal size in bytes
    const widthBytes = Math.ceil(width / 8);
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;

    // Vertical size in dots
    const yL = height & 0xFF;
    const yH = (height >> 8) & 0xFF;

    // Center alignment before raster
    this.setAlign('center');

    // GS v 0 0 xL xH yL yH
    this.buffer.push(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH);

    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data[i] & 0xFF);
    }

    this.newline();
    this.setAlign('left');
    return this;
  }

  public cut(): this {
    this.buffer.push(0x1D, 0x56, 0x41, 0x10); // GS V A 16
    return this;
  }

  public feedPaper(lines: number = 3): this {
    this.newline(lines);
    return this;
  }

  public encodeReceipt(data: ReceiptData, autoCut: boolean = false): number[] {
    const { store, transaction, items, payments, config, logoRaster } = data;

    this.initialize();

    // 1. Header (Logo + Store Name + Address + Phone)
    if (config.showHeader) {
      // Print logo if enabled and raster data is available
      if (config.showLogo !== false && logoRaster && logoRaster.data && logoRaster.data.length > 0) {
        this.rasterImage(logoRaster);
      }

      this.setAlign('center');
      this.setBold(true);
      const storeNameLines = this.wrapText(store.name || '', this.columns);
      storeNameLines.forEach(line => this.textLine(line));
      this.setBold(false);

      if (config.showStoreAddress !== false && store.address) {
        const addressLines = this.wrapText(store.address, this.columns);
        addressLines.forEach(line => this.textLine(line));
      }
      if (config.showStorePhone !== false && store.phone) {
        this.textLine(`Tel: ${store.phone}`);
      }
      this.newline();
    }

    // 2. Transaction Information
    this.setAlign('left');
    if (config.showTransactionNumber) this.row('No:', transaction.transactionNumber);
    if (config.showCashier) this.row('Kasir:', transaction.cashierName);
    if (config.showDateTime) this.row('Waktu:', `${transaction.date} ${transaction.time}`);
    if (config.showCustomer && transaction.customerName) {
      this.row('Pelanggan:', transaction.customerName);
    }

    this.separator();

    // 3. Line Items
    items.forEach(item => {
      const nameLines = this.wrapText(item.name, this.columns);
      nameLines.forEach(line => this.textLine(line));

      const qtyStr = `  ${item.quantity}x @ ${formatCurrency(item.unitPrice)}`;
      this.currencyRow(qtyStr, item.subtotal);
    });

    this.separator();

    // 4. Totals & Discounts
    if (config.showSubtotal) {
      this.currencyRow('Subtotal', transaction.subtotal);
    }
    if (config.showDiscount && transaction.discount > 0) {
      this.currencyRow('Diskon', transaction.discount, { isNegative: true });
    }
    if (config.showTax && (transaction as any).tax > 0) {
      this.currencyRow('Pajak', (transaction as any).tax);
    }
    this.setBold(true);
    if (config.showTotal) {
      this.currencyRow('TOTAL', transaction.total);
    }
    this.setBold(false);

    // 5. Payment details
    if (config.showPaymentMethod && payments && payments.length > 0) {
      this.newline();
      payments.forEach(p => {
        const methodLabel = p.method ? p.method.toUpperCase() : 'CASH';
        this.row('Metode', methodLabel);
        if (p.referenceNumber && p.referenceNumber.trim().length > 0) {
          this.row('No. Ref', p.referenceNumber);
        }
        if (methodLabel === 'CASH' || p.receivedAmount > 0) {
          this.currencyRow('Bayar', p.receivedAmount);
          if (config.showChange) {
            this.currencyRow('Kembali', p.changeAmount);
          }
        } else {
          this.currencyRow(methodLabel, p.amount);
        }
      });
    }

    // 6. Footer Text
    if (config.showFooter && config.footerText && config.footerText.trim().length > 0) {
      this.newline();
      this.setAlign('center');
      const footerLines = config.footerText.split('\n');
      footerLines.forEach((line: string) => {
        const wrapped = this.wrapText(line, this.columns);
        wrapped.forEach((wLine: string) => this.textLine(wLine));
      });
      this.setAlign('left');
    }

    // 7. Feed & Cut
    this.newline(3);
    if (autoCut) {
      this.cut();
    }
    return this.buffer;
  }

  public encodeTest(autoCut: boolean = false): number[] {
    this.initialize();
    this.setAlign('center');
    this.setBold(true);
    this.textLine('=== EDU POS TEST PRINT ===');
    this.setBold(false);
    this.textLine(`Lebar Kertas: ${this.columns === 48 ? '80mm (48 Kolom)' : '58mm (32 Kolom)'}`);
    this.textLine('Printer terhubung dengan baik!');
    this.separator();
    this.textLine(this.formatRow('Kolom Kiri', 'Kolom Kanan', this.columns));
    this.textLine(this.formatCurrencyRow('Kopi Susu Gula Aren 1x', 25000, this.columns));
    this.textLine(this.formatCurrencyRow('TOTAL', 25000, this.columns));
    this.separator();
    this.setAlign('center');
    this.textLine('Alignment 80mm & 58mm OK!');
    this.setAlign('left');
    this.newline(3);
    if (autoCut) {
      this.cut();
    }
    return this.buffer;
  }

  /**
   * Encodes a single semantic ReceiptDocumentNode to ESC/POS commands.
   */
  public encodeNode(node: ReceiptDocumentNode, logoRaster?: RasterBitmap): this {
    switch (node.type) {
      case 'logo': {
        if (logoRaster && logoRaster.data && logoRaster.data.length > 0) {
          this.rasterImage(logoRaster);
        }
        break;
      }

      case 'text_line': {
        const align = node.align || 'left';
        this.setAlign(align);
        if (node.bold) {
          this.setBold(true);
        }
        if (node.text === '') {
          this.newline();
        } else {
          const lines = this.wrapText(node.text, this.columns);
          lines.forEach((l) => this.textLine(l));
        }
        if (node.bold) {
          this.setBold(false);
        }
        this.setAlign('left');
        break;
      }

      case 'key_value_row': {
        this.setAlign('left');
        this.row(node.key, node.value);
        break;
      }

      case 'currency_row': {
        this.setAlign('left');
        if (node.bold) {
          this.setBold(true);
        }
        const rowStr = formatRightAlignedCurrencyRow(
          node.label,
          node.amount,
          this.columns,
          {
            isNegative: node.isNegative,
            prefix: node.prefix,
            currency: node.currency || 'Rp.',
          }
        );
        this.textLine(rowStr);
        if (node.bold) {
          this.setBold(false);
        }
        break;
      }

      case 'item_row': {
        this.setAlign('left');
        const lines = formatItemRow(
          node.name,
          node.quantity,
          node.unitPrice,
          node.subtotal,
          this.columns
        );
        lines.forEach((l) => this.textLine(l));
        break;
      }

      case 'divider': {
        const fillChar = node.char || (node.style === 'double' ? '=' : '-');
        if (node.spacing === 'large') {
          this.newline(1);
        }
        this.separator(fillChar);
        if (node.spacing === 'large') {
          this.newline(1);
        }
        break;
      }

      case 'spacer': {
        const lines = Math.max(1, Math.min(10, Math.floor(node.lines || 1)));
        this.newline(lines);
        break;
      }

      default:
        break;
    }
    return this;
  }

  /**
   * Compiles and encodes a complete ReceiptDocument into ESC/POS printer byte buffer.
   */
  public encodeDocument(
    doc: ReceiptDocument,
    logoRaster?: RasterBitmap,
    autoCut: boolean = false
  ): number[] {
    if (doc.metadata?.paperWidth === '58mm' || doc.metadata?.columns === 32) {
      this.columns = 32;
    } else if (doc.metadata?.paperWidth === '80mm' || doc.metadata?.columns === 48) {
      this.columns = 48;
    }

    this.initialize();

    if (Array.isArray(doc.nodes)) {
      for (const node of doc.nodes) {
        this.encodeNode(node, logoRaster);
      }
    }

    this.newline(3);
    if (autoCut) {
      this.cut();
    }
    return this.buffer;
  }
}
