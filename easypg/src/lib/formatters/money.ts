/**
 * Convert paise to rupees (number).
 * 1_300_000 paise = 13000.00 rupees
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Convert rupees to paise (integer).
 * 13000.00 rupees = 1_300_000 paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Format paise as Indian Rupees string.
 * 1_300_000 -> '₹13,000.00'
 * Uses en-IN locale with Indian comma grouping.
 */
export function formatPaise(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rupees);
}

/**
 * Format paise as compact Indian Rupees (no decimals for whole amounts).
 * 1_300_000 -> '₹13,000'
 * 1_300_050 -> '₹13,000.50'
 */
export function formatPaiseCompact(paise: number): string {
  const rupees = paise / 100;
  const hasDecimal = rupees % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2
  }).format(rupees);
}

/**
 * Parse a rupees string input to paise.
 * Handles strings like '13000', '13,000', '13000.50'
 * Returns null if invalid.
 */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const paise = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(paise) ? paise : null;
}
