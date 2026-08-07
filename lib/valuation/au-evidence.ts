// lib/valuation/au-evidence.ts
//
// PUBLISHED AUSTRALIAN SALE MULTIPLES, ON AN SDE BASIS — the local cross-check for the US sector
// table in `sde-multiples.ts`.
//
// WHY THIS EXISTS. `sde-multiples.ts` is BizBuySell 2025 US data, and the build register carried
// "Australian bands by niche" as the highest-value input outstanding, on the strength of a Finn
// Group broker quoting **1–1.5× for Australian trade businesses** — which, if right, would mean the
// US medians (plumbing 2.62, electrical 2.94) were roughly double the local market and every number
// on the result page with them.
//
// THE RESEARCH DOES NOT SUPPORT THAT, and the reversal is the point of this file.
//
// Australian sources that publish on an **SDE basis** — the same metric as our table — corroborate
// the US medians rather than contradicting them. Every US figure we can cross-check sits INSIDE the
// published Australian range. The 1–1.5× quote is almost certainly on a different basis: EBIT or net
// profit AFTER paying a market salary for the owner's own labour, which for an owner-operated trade
// business is a much smaller earnings figure and therefore carries a much smaller multiple. That is
// precisely the SDE-vs-EBITDA confusion the register already flagged as A5, arriving from the
// outside.
//
// ⚠️ WHAT THIS IS NOT. These are BROKER GUIDES, not a transaction database. None discloses a sample
// size, a date range, or a methodology; the AIBB's transaction data remains members-only. They are
// good enough to answer "is our number in the right postcode for Australia?" and NOT good enough to
// replace a per-sector median. So they are held here as a CHECK on the table, never as a source for
// it — which is also why nothing in this file feeds `computeValuation`.
//
// The honest headline for a broker who asks: our sector figures are US medians, and where Australian
// published guidance exists on the same basis, ours falls inside it.
//
// Retrieved 2026-08-08.

export type EarningsBasis = 'SDE';

export interface AuPublishedRange {
  /** The sector family as the Australian source describes it. */
  family: string;
  /** Low end — typically the owner-operated, single-client, on-the-tools case. */
  low: number;
  /** High end — typically the manager-run, contracted, owner-off-the-tools case. */
  high: number;
  basis: EarningsBasis;
  source: string;
  url: string;
  /** Sector names in `sde-multiples.ts` this range is a fair check on. */
  checks: string[];
  note?: string;
}

/**
 * ⚠️ Ranges are ENDPOINTS OF A READINESS SPECTRUM, not a spread of medians.
 *
 * This is the most useful thing the Australian sources say, and it is worth reading before using any
 * number here. businessforsale.com.au describes the plumbing range in exactly the terms this
 * product's model already uses:
 *
 *   "If you work 60 hours a week heavily on the tools and rely entirely on a single residential
 *    builder for your income, you will be firmly anchored at the 2.0x mark. If you manage a team of
 *    five vans from an office, never touch a wrench, and possess locked-in strata maintenance
 *    contracts, buyers will happily pay the 3.5x premium for that operational security."
 *
 * That is a sector floor and a sector ceiling with transferability interpolating between them — the
 * same shape as `model.ts`, independently arrived at by an Australian broker. It is the strongest
 * external evidence we have that the model's structure is right, and it is also why a FLAT band
 * (identical floor and ceiling for every sector) is the part that does not survive contact with it.
 */
export const AU_PUBLISHED_RANGES: AuPublishedRange[] = [
  {
    family: 'Plumbing',
    low: 2.0,
    high: 3.5,
    basis: 'SDE',
    source: 'businessforsale.com.au — "What Is a Plumbing Business Worth in Australia?"',
    url: 'https://www.businessforsale.com.au/business-advice/what-is-a-plumbing-business-worth-in-australia-valuation-guide',
    checks: ['Plumbing'],
    note:
      'Defines SDE the same way we do — net profit before tax plus owner salary, super and discretionary personal expenses. The clearest AU-source/US-table match we have.',
  },
  {
    family: 'Electrical & trades contracting',
    low: 2.5,
    high: 4.0,
    basis: 'SDE',
    source: 'CT Acquisitions — SDE multiplier by industry (trades)',
    url: 'https://ctacquisitions.com/sellers-discretionary-earnings-multiplier-by-industry/',
    checks: ['Electrical & Mechanical Contracting', 'HVAC'],
  },
  {
    family: 'Cafés, restaurants & bars',
    low: 1.5,
    high: 2.5,
    basis: 'SDE',
    source: 'Miro Capital / Benchmark Business Brokers — AU café & hospitality valuation guides',
    url: 'https://www.mirocapital.com.au/insights/how-much-is-my-cafe-worth-australia/',
    checks: ['Restaurants', 'Coffee Shops', 'Bars, Pubs & Taverns'],
    note:
      'The one family where a US median sits ABOVE the AU range: Bars/Pubs/Taverns at 2.86 vs an AU ceiling of 2.5. AU hospitality carries lease risk and thin margins that the US figure does not price.',
  },
];

/** Every US sector figure this file is able to check, and whether it falls inside. */
export interface CrossCheckResult {
  sector: string;
  usMultiple: number;
  family: string;
  low: number;
  high: number;
  inside: boolean;
}

export function crossCheck(sectorMultiples: ReadonlyArray<{ name: string; sde: number }>): CrossCheckResult[] {
  const bySector = new Map(sectorMultiples.map((s) => [s.name, s.sde]));
  const results: CrossCheckResult[] = [];
  for (const range of AU_PUBLISHED_RANGES) {
    for (const sector of range.checks) {
      const usMultiple = bySector.get(sector);
      if (usMultiple === undefined) continue;
      results.push({
        sector,
        usMultiple,
        family: range.family,
        low: range.low,
        high: range.high,
        inside: usMultiple >= range.low && usMultiple <= range.high,
      });
    }
  }
  return results;
}
