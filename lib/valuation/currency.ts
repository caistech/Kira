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

// AUD is THE DEFAULT, not merely a fallback — the entity is Australian and AU is the primary market.
// It is what every price shows until an owner CHOOSES otherwise on the valuation screen, which is
// exactly what the FAQ promises him ("Australian dollars by default … switch it on the valuation
// screen and the price follows").
//
// This comment previously said buyers were "auto-detected to their own currency from locale", which
// stopped being true when that guess was removed (see below) and is the reason it is being restated
// here: a comment describing behaviour the code no longer has is how a decision gets reversed by
// somebody being helpful.
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

// REMOVED: detectCurrency(). Do not bring it back for a PRICE.
//
// It guessed a currency from navigator.language, and the landing page used it to pick which price to
// show. That is safe only if the prices are FX conversions of one another, and they are not: they
// are round marketing numbers per currency (lib/valuation/pricing.ts), so switching the label
// switches the AMOUNT. £499 is roughly A$970. A visitor whose browser happened to say en-GB was
// quoted a different price, a beat after being shown the right one, three paragraphs above an FAQ
// promising "Australian dollars by default".
//
// It was reported at least three times and survived every fix, because each fix corrected the
// formatting and the defect was the guess itself.
//
// The currency an owner is actually charged is one he CHOOSES on the valuation screen, and that
// choice is what reaches Stripe (app/api/checkout/route.ts). Anything inferred from a browser can
// only ever disagree with it. If a localised marketing price is ever wanted, it needs an explicit
// switcher and the FAQ answer updated in the same change — not an inference.
//
// REGION_TO_CURRENCY is kept: it is still the right lookup for a chooser that a HUMAN drives.

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

/**
 * A valuation figure, rounded to the precision it actually has.
 *
 * "$1,094,292" is what eleven multiple-choice answers produce, and a tester who has been quoting
 * jobs for thirty-five years read it exactly right: "that number tells me the maths is arithmetic
 * dressed up as measurement. Round it. 'About $1.09M' is more believable, not less, and it matches
 * the word 'indicative' you use everywhere else."
 *
 * He is describing significant figures. A model built on category answers and a sector median cannot
 * resolve a business to the dollar, and printing every digit claims it can — on the one screen where
 * this buyer decides whether to believe any of it.
 *
 * Three significant figures, then formatted in the reader's currency. Small figures are left alone:
 * "about $8,000" reads as evasion where "$8,240" is simply the number.
 */
/**
 * The NUMERIC half of `formatMoneyApprox` — the same 3-significant-figure rule, as a number.
 *
 * Exists so a figure DERIVED from two displayed figures can be derived from what is on screen
 * rather than from full precision. Rounding three numbers independently and then printing a
 * subtraction of two of them produces arithmetic that does not tie: $1,020,000 − $874,000 shown
 * beside a gap of $147,000. A tester with a calculator checked exactly that, and he checked it
 * BECAUSE the page's own paragraph on precision invited him to.
 */
export function approxNumber(n: number): number {
  const abs = Math.abs(n);
  if (abs < 10_000) return Math.round(n);
  const magnitude = Math.pow(10, Math.floor(Math.log10(abs)) - 2);
  return Math.round(n / magnitude) * magnitude;
}

export function formatMoneyApprox(n: number, currencyCode: string = DEFAULT_CURRENCY): string {
  const abs = Math.abs(n);
  if (abs < 10_000) return formatMoney(n, currencyCode);
  const magnitude = Math.pow(10, Math.floor(Math.log10(abs)) - 2);
  return formatMoney(Math.round(n / magnitude) * magnitude, currencyCode);
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
