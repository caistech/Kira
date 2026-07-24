// lib/valuation/currency.ts
//
// Currency display for the valuation tool. The valuation MATH is currency-agnostic (it's a multiple
// of profit), so a global owner should just see figures in their own currency. We auto-detect from
// the browser locale and let them override. Only the display changes - never the multiple.

export interface Currency {
  code: string;
  symbol: string;
  locale: string;
  label: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', locale: 'en-US', label: 'USD — US Dollar' },
  { code: 'AUD', symbol: '$', locale: 'en-AU', label: 'AUD — Australian Dollar' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'GBP — British Pound' },
  { code: 'EUR', symbol: '€', locale: 'en-IE', label: 'EUR — Euro' },
  { code: 'CAD', symbol: '$', locale: 'en-CA', label: 'CAD — Canadian Dollar' },
  { code: 'NZD', symbol: '$', locale: 'en-NZ', label: 'NZD — NZ Dollar' },
  { code: 'SGD', symbol: '$', locale: 'en-SG', label: 'SGD — Singapore Dollar' },
  { code: 'ZAR', symbol: 'R', locale: 'en-ZA', label: 'ZAR — South African Rand' },
  { code: 'INR', symbol: '₹', locale: 'en-IN', label: 'INR — Indian Rupee' },
  { code: 'AED', symbol: 'د.إ', locale: 'en-AE', label: 'AED — UAE Dirham' },
];

export const DEFAULT_CURRENCY = 'USD';

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

// Region (from navigator.language, e.g. "en-AU" -> "AU") to a supported currency.
const REGION_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  AU: 'AUD',
  GB: 'GBP',
  UK: 'GBP',
  IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', PT: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR',
  CA: 'CAD',
  NZ: 'NZD',
  SG: 'SGD',
  ZA: 'ZAR',
  IN: 'INR',
  AE: 'AED',
};

export function getCurrency(code: string): Currency {
  return BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_CURRENCY)!;
}

/**
 * Best-effort currency from the browser locale. SSR-safe (returns the default when navigator is
 * absent). Falls back to USD when the region isn't one we support.
 */
export function detectCurrency(): string {
  if (typeof navigator === 'undefined') return DEFAULT_CURRENCY;
  const langs = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  for (const lang of langs) {
    const region = lang.split('-')[1]?.toUpperCase();
    if (region && REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region];
  }
  return DEFAULT_CURRENCY;
}

/** Format a dollar figure in the given currency, no cents. */
export function formatMoney(n: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const c = getCurrency(currencyCode);
  return new Intl.NumberFormat(c.locale, {
    style: 'currency',
    currency: c.code,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}
