// lib/valuation/sde-multiples.ts
//
// REAL small-business sale multiples, expressed as multiples of SDE (Seller's Discretionary
// Earnings = net profit + the owner's salary/perks). Source: BizBuySell 2025 sold-transaction data
// (9,500+ closed small-business sales), as tabulated in published broker benchmark reports.
//
// These are the actual multiples main-street businesses change hands for - NOT public-company
// EV/EBITDA comps. The overall market average is ~2.5x SDE; the range across sectors is ~1.5x to
// ~6.6x. A given sale lands above or below its sector average based on size, owner-dependence,
// recurring revenue, client concentration and growth (see model.ts).
//
// Provenance: BizBuySell Insight Report 2025 (avg SDE multiple ~2.5x across 9,500+ deals) +
// per-sector medians. https://www.bizbuysell.com/learning-center/industry-valuation-multiples/

export interface SectorMultiple {
  name: string;
  group: string;
  /** Sector-median SDE multiple for a TYPICAL business in the sector (average readiness). */
  sde: number;
}

export const SECTOR_MULTIPLES: SectorMultiple[] = [
  // Service
  { name: 'Medical Billing', group: 'Service', sde: 4.41 },
  { name: 'Funeral Homes', group: 'Service', sde: 4.36 },
  { name: 'Laundromats', group: 'Service', sde: 4.12 },
  { name: 'Commercial Laundry', group: 'Service', sde: 3.21 },
  { name: 'Waste Management & Recycling', group: 'Service', sde: 3.2 },
  { name: 'Security Services', group: 'Service', sde: 2.92 },
  { name: 'Architecture & Engineering', group: 'Service', sde: 2.82 },
  { name: 'Property Management', group: 'Service', sde: 2.72 },
  { name: 'Landscaping & Yard Service', group: 'Service', sde: 2.56 },
  { name: 'Pest Control', group: 'Service', sde: 2.35 },
  { name: 'Cleaning Services', group: 'Service', sde: 2.3 },
  { name: 'Dry Cleaners', group: 'Service', sde: 2.2 },
  { name: 'Locksmith', group: 'Service', sde: 2.14 },
  { name: 'Legal Services', group: 'Service', sde: 1.87 },
  // Building & Construction
  { name: 'Building Material & Hardware Store', group: 'Construction', sde: 3.4 },
  { name: 'Concrete', group: 'Construction', sde: 3.04 },
  { name: 'Heavy Construction', group: 'Construction', sde: 2.98 },
  { name: 'Electrical & Mechanical Contracting', group: 'Construction', sde: 2.94 },
  { name: 'HVAC', group: 'Construction', sde: 2.8 },
  { name: 'Painting & Trade Contracting', group: 'Construction', sde: 2.7 },
  { name: 'Plumbing', group: 'Construction', sde: 2.62 },
  // Food & Restaurants
  { name: 'Bars, Pubs & Taverns', group: 'Food & Restaurants', sde: 2.86 },
  { name: 'Bakeries', group: 'Food & Restaurants', sde: 2.68 },
  { name: 'Ice Cream & Frozen Yogurt', group: 'Food & Restaurants', sde: 2.53 },
  { name: 'Coffee Shops', group: 'Food & Restaurants', sde: 2.28 },
  { name: 'Restaurants', group: 'Food & Restaurants', sde: 2.26 },
  { name: 'Breweries', group: 'Food & Restaurants', sde: 1.97 },
  // Healthcare & Fitness
  { name: 'Dental Practices', group: 'Healthcare & Fitness', sde: 3.28 },
  { name: 'Assisted Living & Nursing Homes', group: 'Healthcare & Fitness', sde: 3.18 },
  { name: 'Home Health Care', group: 'Healthcare & Fitness', sde: 2.84 },
  { name: 'Medical Practices', group: 'Healthcare & Fitness', sde: 2.58 },
  { name: 'Gyms & Fitness Centers', group: 'Healthcare & Fitness', sde: 2.44 },
  // Retail
  { name: 'Nursery & Garden Centers', group: 'Retail', sde: 4.15 },
  { name: 'Liquor Stores', group: 'Retail', sde: 3.41 },
  { name: 'Grocery Stores', group: 'Retail', sde: 3.38 },
  { name: 'Pharmacies', group: 'Retail', sde: 2.95 },
  { name: 'Convenience Stores', group: 'Retail', sde: 2.82 },
  { name: 'Clothing & Accessories', group: 'Retail', sde: 2.22 },
  { name: 'Jewelry Stores', group: 'Retail', sde: 1.86 },
  // Manufacturing
  { name: 'Rubber & Plastic Products', group: 'Manufacturing', sde: 5.11 },
  { name: 'Industrial & Commercial Machinery', group: 'Manufacturing', sde: 4.2 },
  { name: 'Machine Shops', group: 'Manufacturing', sde: 3.72 },
  { name: 'Metal Products', group: 'Manufacturing', sde: 3.7 },
  { name: 'Medical Devices', group: 'Manufacturing', sde: 3.25 },
  { name: 'Food & Related Products', group: 'Manufacturing', sde: 2.86 },
  { name: 'Paper & Printing', group: 'Manufacturing', sde: 2.49 },
  // Automotive & Boat
  { name: 'Car Washes', group: 'Automotive', sde: 4.73 },
  { name: 'Gas Stations', group: 'Automotive', sde: 3.7 },
  { name: 'Equipment Rental & Dealers', group: 'Automotive', sde: 3.55 },
  { name: 'Auto Repair & Service', group: 'Automotive', sde: 2.7 },
  { name: 'Car Dealerships', group: 'Automotive', sde: 2.32 },
  // Online & Technology
  { name: 'Software & App Companies', group: 'Online & Technology', sde: 3.41 },
  { name: 'Websites & Ecommerce', group: 'Online & Technology', sde: 3.33 },
  { name: 'IT & Software Services', group: 'Online & Technology', sde: 2.99 },
  { name: 'Cell Phone & Computer Repair', group: 'Online & Technology', sde: 1.78 },
  // Other
  { name: 'Marinas & Fishing', group: 'Other', sde: 6.6 },
  { name: 'Storage Facilities', group: 'Other', sde: 4.6 },
  { name: 'Dog Daycare & Boarding', group: 'Other', sde: 4.4 },
  { name: 'Hotels', group: 'Other', sde: 4.02 },
  { name: 'Day Care & Child Care', group: 'Other', sde: 3.4 },
  { name: 'Insurance Agencies', group: 'Other', sde: 2.68 },
  { name: 'Hair Salons & Barber Shops', group: 'Other', sde: 2.18 },
  { name: 'Nail Salons', group: 'Other', sde: 1.88 },
  { name: 'Routes (vending/distribution)', group: 'Other', sde: 1.51 },
];

/** The overall market-average SDE multiple - the honest fallback for an unmatched sector. */
export const AVERAGE_SDE_MULTIPLE = 2.5;

import { synonymSector } from './industry-synonyms';

const BY_NAME = new Map(SECTOR_MULTIPLES.map((s) => [s.name.toLowerCase(), s.sde]));

/**
 * Resolve an industry string to its real SDE multiple. Tries exact match, then a loose
 * substring match either direction, then falls back to the market average (matched=false) rather
 * than fabricating a sector-specific figure.
 */
export function lookupSdeMultiple(industry: string): { sde: number; matched: boolean } {
  if (!industry || !industry.trim()) return { sde: AVERAGE_SDE_MULTIPLE, matched: false };
  const q = industry.trim().toLowerCase();
  const exact = BY_NAME.get(q);
  if (typeof exact === 'number') return { sde: exact, matched: true };

  // The Australian word for the trade, before the loose match.
  //
  // Every sector name here is worded for an American — "Day Care & Child Care", "Hair Salons &
  // Barber Shops" — so an owner typing "plumber", "sparky" or "childcare" matched nothing and was
  // silently dropped onto the market average at question one. This runs first because it is exact:
  // the loose match below would answer "concreter" with nothing and "civil" with nothing, while
  // happily matching a stray substring somewhere else.
  const viaSynonym = synonymSector(q);
  if (viaSynonym) {
    const sde = BY_NAME.get(viaSynonym.toLowerCase());
    if (typeof sde === 'number') return { sde, matched: true };
  }

  // Loose match: the query contains a sector name, or a sector name contains the query.
  for (const s of SECTOR_MULTIPLES) {
    const n = s.name.toLowerCase();
    if (q.includes(n) || n.includes(q)) return { sde: s.sde, matched: true };
  }
  return { sde: AVERAGE_SDE_MULTIPLE, matched: false };
}
