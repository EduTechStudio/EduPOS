/**
 * Shared Column-Based Layout Helper for EduPOS Receipts.
 * 
 * Used by both React Native receipt preview and ESC/POS printer encoder
 * to guarantee 100% column parity across 58mm (32 columns) and 80mm (48 columns).
 */

export interface CurrencyFormatOptions {
  isNegative?: boolean;
  prefix?: string;
  currency?: string;
}

export interface HeaderRowOptions {
  rightText?: string;
  labelWidth?: number;
}

/**
 * Format a number using Indonesian thousand separator (dot).
 * E.g. 1300000 -> "1.300.000"
 */
export function formatNumber(num: number): string {
  const rounded = Math.abs(Math.round(num || 0));
  return rounded.toLocaleString('id-ID');
}

/**
 * Formats a currency amount into a single cohesive group:
 * e.g. "Rp. 200.000", "Rp. 1.100.000", "Rp. -50.000", "Rp. 0"
 */
export function formatCurrencyGroup(
  amount: number,
  options?: CurrencyFormatOptions
): string {
  const currency = options?.currency || 'Rp.';
  const sign = options?.isNegative ? '-' : (options?.prefix || '');
  return `${currency} ${sign}${formatNumber(amount)}`;
}

/**
 * Formats a summary currency row with a consistent fixed column for "Rp."
 * across subtotal, discount, tax, total, payment received, and change.
 * 
 * Column positions:
 * - 80mm: Rp. starts at column index 32; amount is right-aligned in columns 36..47.
 * - 58mm: Rp. starts at column index 18; amount is right-aligned in columns 22..31.
 * 
 * All numeric amounts align flush right to the final printable column (totalWidth - 1).
 */
export function formatRightAlignedCurrencyRow(
  label: string,
  amount: number,
  totalWidth: number,
  options?: CurrencyFormatOptions
): string {
  const is80 = totalWidth >= 48;
  const rpCol = is80 ? 32 : 18;
  const curr = options?.currency || 'Rp.';
  const sign = options?.isNegative ? '-' : (options?.prefix || '');
  const numPart = `${sign}${formatNumber(amount)}`;
  const rightWidth = totalWidth - rpCol;

  const prefixCurr = `${curr} `;
  const availForNum = Math.max(1, rightWidth - prefixCurr.length);
  const numPadded = numPart.padStart(availForNum, ' ');
  const rightBlock = `${prefixCurr}${numPadded}`;

  let displayLabel = label || '';
  if (displayLabel.length > rpCol) {
    displayLabel = displayLabel.slice(0, rpCol).trimEnd();
  }

  return displayLabel.padEnd(rpCol, ' ') + rightBlock;
}

/**
 * Formats a general two-column row with left text starting at column 0
 * and right text flush right ending at index (totalWidth - 1).
 */
export function formatAlignedRow(
  leftText: string,
  rightText: string,
  totalWidth: number
): string {
  const left = leftText || '';
  const right = rightText || '';

  if (left.length + right.length + 1 > totalWidth) {
    const maxLeft = Math.max(0, totalWidth - right.length - 1);
    const trimmedLeft = left.slice(0, maxLeft);
    const spaces = Math.max(1, totalWidth - trimmedLeft.length - right.length);
    return trimmedLeft + ' '.repeat(spaces) + right;
  }

  const spacesCount = totalWidth - left.length - right.length;
  return left + ' '.repeat(spacesCount) + right;
}

/**
 * Word wraps text into lines of at most maxWidth characters.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      if (word.length <= maxWidth) {
        currentLine = word;
      } else {
        // Split long word that exceeds maxWidth
        for (let i = 0; i < word.length; i += maxWidth) {
          lines.push(word.slice(i, i + maxWidth));
        }
      }
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      if (word.length <= maxWidth) {
        currentLine = word;
      } else {
        currentLine = '';
        for (let i = 0; i < word.length; i += maxWidth) {
          const chunk = word.slice(i, i + maxWidth);
          if (i + maxWidth >= word.length) {
            currentLine = chunk;
          } else {
            lines.push(chunk);
          }
        }
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Formats header information with strict consistent column alignment:
 * - Labels start at column 0.
 * - Colons (:) appear at a fixed column index (default index 8, labelWidth 8).
 * - Values begin at column index 10.
 * - Continuation lines for long values indent with 10 spaces (' '.repeat(10)).
 */
export function formatHeaderRow(
  label: string,
  value: string,
  totalWidth: number,
  options?: HeaderRowOptions
): string[] {
  const labelWidth = options?.labelWidth ?? 8;
  const labelPadded = (label || '').padEnd(labelWidth, ' ');
  const prefix = `${labelPadded}: `; // Exactly (labelWidth + 2) chars, e.g. 10 chars
  const prefixLen = prefix.length;
  const val = (value || '').trim();

  // If rightText is specified (e.g. date override)
  if (options?.rightText) {
    const rightText = options.rightText.trim();
    const availOnLine1 = totalWidth - prefixLen - rightText.length - 1;

    if (val.length <= availOnLine1) {
      const spacesCount = totalWidth - prefixLen - val.length - rightText.length;
      const line1 = prefix + val + ' '.repeat(spacesCount) + rightText;
      return [line1];
    }

    const words = val.split(/\s+/).filter(Boolean);
    let line1Name = '';
    let remainingWords: string[] = [];

    if (availOnLine1 > 0 && words.length > 0 && words[0].length <= availOnLine1) {
      let accumulated = '';
      let idx = 0;
      while (idx < words.length) {
        const candidate = accumulated ? `${accumulated} ${words[idx]}` : words[idx];
        if (candidate.length <= availOnLine1) {
          accumulated = candidate;
          idx++;
        } else {
          break;
        }
      }
      line1Name = accumulated;
      remainingWords = words.slice(idx);
    } else {
      remainingWords = words;
    }

    const spacesLine1 = totalWidth - prefixLen - line1Name.length - rightText.length;
    const line1 = prefix + line1Name + ' '.repeat(spacesLine1) + rightText;
    const result: string[] = [line1];

    if (remainingWords.length > 0) {
      const remainingText = remainingWords.join(' ');
      const maxContinuationWidth = Math.max(1, totalWidth - prefixLen);
      const continuationLines = wrapText(remainingText, maxContinuationWidth);
      for (const cLine of continuationLines) {
        result.push(' '.repeat(prefixLen) + cLine);
      }
    }

    return result;
  }

  // Standard left-aligned header row (No. Trx, Tgl, Kasir, Plg)
  const maxValWidth = Math.max(1, totalWidth - prefixLen);
  if (val.length <= maxValWidth) {
    return [prefix + val];
  }

  // Wrap long value, indenting continuation lines to match value start column
  const wrapped = wrapText(val, maxValWidth);
  return wrapped.map((chunk, idx) => (idx === 0 ? prefix + chunk : ' '.repeat(prefixLen) + chunk));
}

/**
 * Formats an item line following the approved receipt layout:
 * - Line 1: Product name on its own line (word-wrapped to totalWidth if needed).
 * - Line 2: Quantity (right-aligned in fixed column), "x" (in fixed column),
 *           Unit price (right-aligned in fixed column),
 *           Subtotal (right-aligned at final printable column).
 * 
 * IMPORTANT: No "Rp." is printed for item unit prices or subtotals.
 */
export function formatItemRow(
  name: string,
  quantity: number,
  unitPrice: number,
  subtotal: number,
  totalWidth: number
): string[] {
  const result: string[] = [];

  // Line 1: Item name (word-wrapped)
  const nameLines = wrapText(name || '', totalWidth);
  result.push(...nameLines);

  // Line 2: Fixed columns for Qty, x, Unit Price, and Subtotal
  const is80 = totalWidth >= 48;
  const qtyWidth = is80 ? 4 : 3;
  const xSep = is80 ? '  x   ' : '  x ';
  const priceWidth = 8;

  const qtyStr = String(quantity || 0).padStart(qtyWidth, ' ');
  const priceStr = formatNumber(unitPrice).padStart(priceWidth, ' ');
  const leftBlock = `${qtyStr}${xSep}${priceStr}`;
  const subtotalStr = formatNumber(subtotal);

  if (leftBlock.length + subtotalStr.length + 1 <= totalWidth) {
    const spacesCount = totalWidth - leftBlock.length - subtotalStr.length;
    result.push(leftBlock + ' '.repeat(spacesCount) + subtotalStr);
  } else {
    // Graceful wrap if values are exceptionally large
    result.push(leftBlock);
    const pad = Math.max(0, totalWidth - subtotalStr.length);
    result.push(' '.repeat(pad) + subtotalStr);
  }

  return result;
}
