/**
 * Currency utility for handling Indonesian Rupiah formatted output from integer minor units.
 */

/**
 * Format integer minor unit amount to formatted Indonesian Rupiah string.
 * Example: 15000 -> "Rp 15.000"
 */
export function formatCurrency(amount: number): string {
  const safeAmount = Math.round(amount || 0);
  return `Rp ${safeAmount.toLocaleString('id-ID')}`;
}

/**
 * Format integer minor unit amount to formatted numeric string (without currency symbol).
 * Example: 15000 -> "15.000", -15000 -> "-15.000"
 */
export function formatNumber(amount: number): string {
  const safeAmount = Math.round(amount || 0);
  return safeAmount.toLocaleString('id-ID');
}

/**
 * Parse input string into numeric integer minor units.
 * Example: "15.000" -> 15000, "Rp 15,000" -> 15000
 */
export function parseCurrencyInput(text: string): number {
  const digitsOnly = text.replace(/[^0-9]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}
