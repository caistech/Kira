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
  /**
   * What the consumption tax is CALLED in this jurisdiction.
   *
   * Every displayed price is tax-EXCLUSIVE and must say so next to the figure. "+ GST" is right in
   * Australia and meaningless in Britain, so the label travels with the currency rather than being
   * hardcoded — this product is reachable from anywhere and already lets a visitor switch currency.
   */
  tax: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', locale: 'en-US', label: 'USD — US Dollar', tax: 'sales tax' },
  { code: 'AUD', symbol: '$', locale: 'en-AU', label: 'AUD — Australian Dollar', tax: 'GST' },
  { code: 'GBP', symbol: '£', locale: 'en-GB', label: 'GBP — British Pound', tax: 'VAT' },
  { code: 'EUR', symbol: '€', locale: 'en-IE', label: 'EUR — Euro', tax: 'VAT' },
  { code: 'CAD', symbol: '$', locale: 'en-CA', label: 'CAD — Canadian Dollar', tax: 'GST/HST' },
  { code: 'NZD', symbol: '$', locale: 'en-NZ', label: 'NZD — NZ Dollar', tax: 'GST' },
  { code: 'SGD', symbol: '$', locale: 'en-SG', label: 'SGD — Singapore Dollar', tax: 'GST' },
  { code: 'ZAR', symbol: 'R', locale: 'en-ZA', label: 'ZAR — South African Rand', tax: 'VAT' },
  { code: 'INR', symbol: '₹', locale: 'en-IN', label: 'INR — Indian Rupee', tax: 'GST' },
  { code: 'AED', symbol: 'د.إ', locale: 'en-AE', label: 'AED — UAE Dirham', tax: 'VAT' },
];

// AUD is the fallback (Corporate AI Solutions / Global Buildtech is an Australian entity and AU is the
// primary market). Buyers are still auto-detected to their own currency from locale (detectCurrency);
// AUD only applies when we can't map the region — never a hardcoded £/$ for an AU owner.
export const DEFAULT_CURRENCY = 'AUD';

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
 * Whether we know what the consumption tax is CALLED in this currency's jurisdiction.
 *
 * Matters because getCurrency falls back to AUD, which silently labels an unknown currency "+ GST".
 * Harmless on the valuation (a fallback locale only changes formatting) and wrong on a PRICE, where
 * it names the wrong tax regime to a real buyer. A caller showing a price should check this and show
 * nothing rather than a confident mislabel.
 */
export function isSupportedCurrency(code: string): boolean {
  return BY_CODE.has(code);
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

/**
 * The tax suffix for a displayed PRICE, e.g. "+ GST" / "+ VAT".
 *
 * Prices are quoted tax-exclusive and every surface that shows one must carry this. Stating it is
 * not a nicety: a business buyer reads an unqualified figure as the amount that will leave their
 * account, and in most of these jurisdictions it is not.
 */
export function taxSuffix(currencyCode: string = DEFAULT_CURRENCY): string {
  return `+ ${getCurrency(currencyCode).tax}`;
}

/** A price with its tax qualifier — the ONLY way a price should reach a screen. */
export function formatPrice(n: number, currencyCode: string = DEFAULT_CURRENCY): string {
  return `${formatMoney(n, currencyCode)} ${taxSuffix(currencyCode)}`;
}

/** Format a dollar figure in the given currency, no cents. VALUATION figures only — for a PRICE use formatPrice. */
export function formatMoney(n: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const c = getCurrency(currencyCode);
  return new Intl.NumberFormat(c.locale, {
    style: 'currency',
    currency: c.code,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}
