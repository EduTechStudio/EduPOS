/**
 * Shared Quantity and Wholesale Tier Utilities for EduPOS.
 *
 * Provides safe, locale-aware parsing, predictable display formatting,
 * deterministic financial rounding, and wholesale tier evaluation.
 */

export interface QuantityParseOptions {
  /**
   * Whether fractional / decimal quantities are permitted (e.g. for products sold by weight).
   * If false, any decimal separator or fractional component makes the input invalid.
   * Default: true
   */
  allowDecimal?: boolean;
  /**
   * Maximum decimal places to retain (e.g. 3 for grams: 0.001 kg).
   * Default: 3
   */
  maxDecimals?: number;
  /**
   * Minimum acceptable quantity value.
   * Default: 0
   */
  min?: number;
  /**
   * Maximum acceptable quantity value.
   * Default: 999999
   */
  max?: number;
}

/**
 * Parses user-entered quantity string into a safe numeric value.
 *
 * Supports both Indonesian comma ("0,471") and standard dot ("0.471").
 *
 * Strict Validation Rules:
 * - Rejects empty string or whitespace-only text (returns null)
 * - Rejects negative numbers and minus signs ("-1", "-0.471") (returns null)
 * - Rejects non-numeric characters ("abc", "12a", "2 kg") (returns null)
 * - Rejects multiple separators ("0.4.1", "1,2,3", "0..5", "1.,5", "1,.5") (returns null)
 * - Rejects standalone separator ("." or ",") (returns null)
 * - Rejects decimals when allowDecimal is false ("1.5" or "1,5") (returns null)
 * - Rejects non-finite values (Infinity, NaN) (returns null)
 * - Rejects values exceeding bounds [min, max] (returns null)
 *
 * Returns a valid finite number or null if the input is malformed.
 */
export function parseQuantityInput(
  text: string | null | undefined,
  options: QuantityParseOptions = {}
): number | null {
  if (text === null || text === undefined) {
    return null;
  }

  const trimmed = text.trim();
  if (trimmed === '') {
    return null;
  }

  const {
    allowDecimal = true,
    maxDecimals = 3,
    min = 0,
    max = 999999,
  } = options;

  // Explicitly reject negative signs
  if (trimmed.includes('-')) {
    return null;
  }

  // Count occurrences of decimal separators
  const commaCount = (trimmed.match(/,/g) || []).length;
  const dotCount = (trimmed.match(/\./g) || []).length;

  // More than one separator of any kind is an invalid malformed separator
  if (commaCount + dotCount > 1) {
    return null;
  }

  // If decimal is forbidden, any separator is invalid
  if (!allowDecimal && (commaCount > 0 || dotCount > 0)) {
    return null;
  }

  // Normalize single comma to dot
  const normalized = trimmed.replace(',', '.');

  // Reject standalone separator ("." or ",")
  if (normalized === '.') {
    return null;
  }

  // Verify format matches strictly: digits, or digits with decimal fraction
  // Examples: "12", "0.471", ".5" is ambiguous and rejected, "5." is rejected
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const val = parseFloat(normalized);

  if (!Number.isFinite(val) || isNaN(val)) {
    return null;
  }

  if (val < min || val > max) {
    return null;
  }

  // Clamp to maxDecimals (e.g. 3 decimals = Math.round(val * 1000) / 1000)
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round(val * factor) / factor;

  return rounded;
}

/**
 * Validates whether user-entered text represents a strictly positive, parseable quantity.
 */
export function isValidQuantityInput(
  text: string | null | undefined,
  options: QuantityParseOptions = {}
): boolean {
  const parsed = parseQuantityInput(text, options);
  return parsed !== null && parsed > 0;
}

/**
 * Formats a numeric quantity for display on screen and thermal receipts.
 *
 * - Integers format without decimals: 1 -> "1", 25 -> "25"
 * - Decimals format up to maxDecimals without floating-point artifacts: 0.471 -> "0.471"
 * - Trims unnecessary trailing zeros: 1.500 -> "1.5"
 * - Optionally appends a unit label: formatQuantity(0.471, { unit: 'kg' }) -> "0.471 kg"
 */
export function formatQuantity(
  quantity: number | null | undefined,
  options: { unit?: string; maxDecimals?: number } = {}
): string {
  if (quantity === null || quantity === undefined || !Number.isFinite(quantity) || isNaN(quantity)) {
    return '0';
  }

  const maxDecimals = options.maxDecimals ?? 3;
  const factor = Math.pow(10, maxDecimals);
  const safeQty = Math.round(quantity * factor) / factor;

  let formatted: string;
  if (Number.isInteger(safeQty)) {
    formatted = safeQty.toString();
  } else {
    // Format to fixed then remove trailing zeros
    formatted = safeQty.toFixed(maxDecimals).replace(/\.?0+$/, '');
  }

  if (options.unit && options.unit.trim().length > 0) {
    return `${formatted} ${options.unit.trim()}`;
  }

  return formatted;
}

/**
 * Deterministic line item subtotal calculation for integer Rupiah.
 *
 * Rule: Math.round(unitPrice * quantity)
 * - unitPrice: integer minor units (Rupiah)
 * - quantity: numeric (integer or fractional e.g. 0.471)
 *
 * Guarantees a non-negative integer Rupiah subtotal with zero fractional cents.
 */
export function calculateLineSubtotal(
  unitPrice: number,
  quantity: number
): number {
  if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity) || unitPrice < 0 || quantity < 0) {
    return 0;
  }
  return Math.max(0, Math.round(unitPrice * quantity));
}

export interface WholesaleTierItem {
  min_quantity: number;
  unit_price: number;
}

/**
 * Deterministically resolves the effective unit price for a given product and quantity.
 *
 * Evaluation Rule:
 * - Tiers are sorted descending by min_quantity.
 * - The first tier where quantity >= tier.min_quantity is selected.
 * - The tier price applies to every unit in the line once the threshold is satisfied.
 * - If no tier qualifies, falls back to baseSellingPrice.
 */
export function resolveTierUnitPrice<T extends WholesaleTierItem>(
  baseSellingPrice: number,
  tiers: T[] | undefined | null,
  quantity: number
): { unitPrice: number; activeTier: T | null } {
  if (!tiers || tiers.length === 0 || quantity <= 0) {
    return { unitPrice: Math.max(0, Math.round(baseSellingPrice)), activeTier: null };
  }

  // Sort descending by min_quantity to match highest qualifying threshold first
  const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);

  for (const tier of sortedTiers) {
    if (quantity >= tier.min_quantity) {
      return {
        unitPrice: Math.max(0, Math.round(tier.unit_price)),
        activeTier: tier,
      };
    }
  }

  return { unitPrice: Math.max(0, Math.round(baseSellingPrice)), activeTier: null };
}

/**
 * Standard continuous measurement units (weight, volume, length)
 * where decimal / fractional quantities are physically meaningful and allowed.
 */
export const FRACTIONAL_UNITS = new Set([
  'kg',
  'kilogram',
  'g',
  'gr',
  'gram',
  'ons',
  'l',
  'liter',
  'ltr',
  'ml',
  'meter',
  'm',
  'cm',
]);

/**
 * Determines whether a given product unit represents a continuous measurement
 * (weight, volume, length) that permits fractional / decimal quantities.
 * Discrete units like 'pcs', 'cup', 'box', 'btl' return false.
 */
export function isDecimalAllowedForUnit(unit?: string | null): boolean {
  if (!unit) return false;
  return FRACTIONAL_UNITS.has(unit.trim().toLowerCase());
}
