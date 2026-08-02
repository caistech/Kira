// The word an Australian owner actually types → the sector name in the data.
//
// THE PROBLEM THIS SOLVES. The multiples come from BizBuySell, so every sector is worded for an
// American: "Day Care & Child Care", "Ice Cream & Frozen Yogurt", "Hair Salons & Barber Shops". A
// 66-year-old plumber types "plumber", gets "no sector match", and is silently dropped onto the
// market-average multiple — at QUESTION ONE, before he has seen anything the product does. The
// sector multiple is the spine of the valuation, so a miss here doesn't just annoy him, it quietly
// changes his number.
//
// WHY A TABLE FIRST, AND NOT JUST AN LLM. This layer is instant, free, deterministic and testable.
// A model call at question one adds latency to the first thing he touches, costs money per visitor,
// and can be wrong in ways nobody sees. The table handles the overwhelming majority — the trades and
// services this ICP actually runs — and the model is the backstop for the long tail.
//
// Keys are matched after lowercasing and stripping punctuation. Order does not matter; the longest
// matching key wins, so "auto electrician" beats "electrician".

/** Australian (and British) trade words → the exact `SECTOR_MULTIPLES` name they belong to. */
export const INDUSTRY_SYNONYMS: Record<string, string> = {
  // Trades — the core of this ICP
  plumber: 'Plumbing',
  plumbing: 'Plumbing',
  'plumber and gasfitter': 'Plumbing',
  gasfitter: 'Plumbing',
  gasfitting: 'Plumbing',
  drainer: 'Plumbing',
  electrician: 'Electrical & Mechanical Contracting',
  electrical: 'Electrical & Mechanical Contracting',
  sparky: 'Electrical & Mechanical Contracting',
  'auto electrician': 'Auto Repair & Service',
  hvac: 'HVAC',
  'air conditioning': 'HVAC',
  airconditioning: 'HVAC',
  refrigeration: 'HVAC',
  // BUILDERS DELIBERATELY RESOLVE TO NO SECTOR — see SYNONYM_GROUPS below.
  //
  // "builder" used to return Heavy Construction, which is civil work: roads, earthworks,
  // infrastructure. A residential builder is not that, and it is the highest multiple in the
  // Construction group (2.98), so the core ICP was handed the wrong number at question one — the
  // very failure this table exists to prevent, in the one trade the product is built around.
  //
  // The honest answer is that the BizBuySell data has no residential/general building sector, and
  // inventing a multiple for one would corrupt a sourced dataset with a guess. So a builder now
  // sees the whole Construction group and picks, and if he picks nothing he gets the stated market
  // average rather than a civil-infrastructure multiple wearing his name.
  carpenter: 'Painting & Trade Contracting',
  carpentry: 'Carpentry & Joinery',
  // Australian trade words the list did not know. A tester: "it doesn't know joinery, which is
  // what half the blokes I know call their business." It said so honestly rather than pretending,
  // which he rated above the coverage — but the coverage is cheap.
  joinery: 'Carpentry & Joinery',
  joiner: 'Carpentry & Joinery',
  cabinetmaking: 'Carpentry & Joinery',
  cabinetmaker: 'Carpentry & Joinery',
  shopfitting: 'Carpentry & Joinery',
  shopfitter: 'Carpentry & Joinery',
  // The words a house builder actually uses about himself.
  builder: 'Residential Building & General Contracting',
  builders: 'Residential Building & General Contracting',
  building: 'Residential Building & General Contracting',
  residential: 'Residential Building & General Contracting',
  'home builder': 'Residential Building & General Contracting',
  'house builder': 'Residential Building & General Contracting',
  construction: 'Residential Building & General Contracting',
  contracting: 'Residential Building & General Contracting',
  renovations: 'Residential Building & General Contracting',
  extensions: 'Residential Building & General Contracting',
  earthmoving: 'Landscaping & Earthmoving',
  excavation: 'Landscaping & Earthmoving',
  chippy: 'Painting & Trade Contracting',
  painter: 'Painting & Trade Contracting',
  painting: 'Painting & Trade Contracting',
  plasterer: 'Painting & Trade Contracting',
  tiler: 'Painting & Trade Contracting',
  roofer: 'Painting & Trade Contracting',
  roofing: 'Painting & Trade Contracting',
  fencing: 'Painting & Trade Contracting',
  concreter: 'Concrete',
  concreting: 'Concrete',
  civil: 'Heavy Construction',
  'civil works': 'Heavy Construction',
  demolition: 'Heavy Construction',
  scaffolding: 'Heavy Construction',
  welding: 'Machine Shops',
  fabrication: 'Metal Products',
  'sheet metal': 'Metal Products',
  engineering: 'Architecture & Engineering',
  surveying: 'Architecture & Engineering',
  architect: 'Architecture & Engineering',
  draftsman: 'Architecture & Engineering',

  // Food & hospitality
  cafe: 'Coffee Shops',
  café: 'Coffee Shops',
  coffee: 'Coffee Shops',
  'coffee shop': 'Coffee Shops',
  restaurant: 'Restaurants',
  takeaway: 'Restaurants',
  'fish and chips': 'Restaurants',
  catering: 'Restaurants',
  pub: 'Bars, Pubs & Taverns',
  hotel: 'Hotels',
  bar: 'Bars, Pubs & Taverns',
  bakery: 'Bakeries',
  baker: 'Bakeries',
  butcher: 'Grocery Stores',
  greengrocer: 'Grocery Stores',
  'bottle shop': 'Liquor Stores',
  'liquor store': 'Liquor Stores',
  brewery: 'Breweries',

  // Personal services
  hairdresser: 'Hair Salons & Barber Shops',
  hairdressing: 'Hair Salons & Barber Shops',
  'hair salon': 'Hair Salons & Barber Shops',
  barber: 'Hair Salons & Barber Shops',
  'beauty salon': 'Nail Salons',
  'nail salon': 'Nail Salons',
  gym: 'Gyms & Fitness Centers',
  'personal training': 'Gyms & Fitness Centers',
  'fitness studio': 'Gyms & Fitness Centers',

  // Health
  physio: 'Medical Practices',
  physiotherapy: 'Medical Practices',
  chiro: 'Medical Practices',
  chiropractic: 'Medical Practices',
  podiatry: 'Medical Practices',
  optometry: 'Medical Practices',
  psychology: 'Medical Practices',
  'medical centre': 'Medical Practices',
  'gp clinic': 'Medical Practices',
  dentist: 'Dental Practices',
  dental: 'Dental Practices',
  pharmacy: 'Pharmacies',
  chemist: 'Pharmacies',
  'aged care': 'Assisted Living & Nursing Homes',
  'nursing home': 'Assisted Living & Nursing Homes',
  'disability support': 'Home Health Care',
  ndis: 'Home Health Care',
  'home care': 'Home Health Care',

  // Professional & other services
  accountant: 'Legal Services',
  accounting: 'Legal Services',
  bookkeeping: 'Legal Services',
  'tax agent': 'Legal Services',
  lawyer: 'Legal Services',
  solicitor: 'Legal Services',
  conveyancing: 'Legal Services',
  'real estate': 'Property Management',
  'property management': 'Property Management',
  'strata management': 'Property Management',
  insurance: 'Insurance Agencies',
  'insurance broker': 'Insurance Agencies',
  'mortgage broker': 'Insurance Agencies',
  cleaning: 'Cleaning Services',
  cleaner: 'Cleaning Services',
  'commercial cleaning': 'Cleaning Services',
  'pest control': 'Pest Control',
  landscaping: 'Landscaping & Yard Service',
  gardening: 'Landscaping & Yard Service',
  'lawn mowing': 'Landscaping & Yard Service',
  'tree lopping': 'Landscaping & Yard Service',
  arborist: 'Landscaping & Yard Service',
  nursery: 'Nursery & Garden Centers',
  security: 'Security Services',
  locksmith: 'Locksmith',
  funeral: 'Funeral Homes',
  'funeral director': 'Funeral Homes',
  childcare: 'Day Care & Child Care',
  'child care': 'Day Care & Child Care',
  'early learning': 'Day Care & Child Care',
  kindergarten: 'Day Care & Child Care',
  'dog grooming': 'Dog Daycare & Boarding',
  kennels: 'Dog Daycare & Boarding',
  'vet clinic': 'Medical Practices',
  veterinary: 'Medical Practices',

  // Trade / transport / retail
  mechanic: 'Auto Repair & Service',
  'auto repair': 'Auto Repair & Service',
  'panel beater': 'Auto Repair & Service',
  'smash repair': 'Auto Repair & Service',
  'tyre shop': 'Auto Repair & Service',
  'car wash': 'Car Washes',
  'car yard': 'Car Dealerships',
  'car dealership': 'Car Dealerships',
  'service station': 'Gas Stations',
  'petrol station': 'Gas Stations',
  'hire company': 'Equipment Rental & Dealers',
  'equipment hire': 'Equipment Rental & Dealers',
  'plant hire': 'Equipment Rental & Dealers',
  'labour hire': 'Security Services',
  transport: 'Routes (vending/distribution)',
  trucking: 'Routes (vending/distribution)',
  freight: 'Routes (vending/distribution)',
  courier: 'Routes (vending/distribution)',
  logistics: 'Routes (vending/distribution)',
  'self storage': 'Storage Facilities',
  storage: 'Storage Facilities',
  hardware: 'Building Material & Hardware Store',
  'building supplies': 'Building Material & Hardware Store',
  timber: 'Building Material & Hardware Store',
  printing: 'Paper & Printing',
  signage: 'Paper & Printing',
  manufacturing: 'Industrial & Commercial Machinery',
  'engineering workshop': 'Machine Shops',
  'machine shop': 'Machine Shops',
  'it support': 'IT & Software Services',
  'managed services': 'IT & Software Services',
  software: 'Software & App Companies',
  ecommerce: 'Websites & Ecommerce',
  'online store': 'Websites & Ecommerce',
  'phone repair': 'Cell Phone & Computer Repair',
  'computer repair': 'Cell Phone & Computer Repair',
  laundromat: 'Laundromats',
  'dry cleaning': 'Dry Cleaners',
  'waste management': 'Waste Management & Recycling',
  'skip bins': 'Waste Management & Recycling',
  recycling: 'Waste Management & Recycling',
  marina: 'Marinas & Fishing',
  fishing: 'Marinas & Fishing',
  jeweller: 'Jewelry Stores',
  clothing: 'Clothing & Accessories',
  'convenience store': 'Convenience Stores',
  'corner shop': 'Convenience Stores',
  supermarket: 'Grocery Stores',
};

const normalise = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Map a typed industry to a sector name, or null.
 *
 * Longest key first, so a more specific phrase beats a word contained inside it — "auto electrician"
 * must not be answered by "electrician".
 */
/**
 * Words that identify a GROUP but not a sector — show the group and let him choose.
 *
 * Some trades have no single right answer in the data. A residential builder is not Heavy
 * Construction (civil), not Painting & Trade Contracting (subcontract trades) and not Concrete; the
 * dataset simply has no bucket for him. Guessing one changes his headline number; saying "no match"
 * and moving on leaves him on the market average without ever seeing that seven construction sectors
 * exist.
 *
 * So these surface the whole group in the suggestion list. He is one tap from the right sector, and
 * whatever he picks is a real sourced multiple rather than our approximation of him.
 */
export const SYNONYM_GROUPS: Record<string, string> = {
  'home building': 'Construction',
  'residential builder': 'Construction',
  'residential building': 'Construction',
  'new homes': 'Construction',
  'home renovation': 'Construction',
  renovator: 'Construction',
  'construction company': 'Construction',
  'general contractor': 'Construction',
  'shop fitting': 'Construction',
};

/** The group a typed phrase points at, when it points at a group rather than one sector. */
export function synonymGroup(industry: string): string | null {
  const q = (industry || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!q) return null;
  if (SYNONYM_GROUPS[q]) return SYNONYM_GROUPS[q];
  // Longest matching key wins, same rule as the sector table.
  const hit = Object.keys(SYNONYM_GROUPS)
    .filter((k) => q.includes(k))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? SYNONYM_GROUPS[hit] : null;
}

export function synonymSector(industry: string): string | null {
  const q = normalise(industry);
  if (!q) return null;

  if (INDUSTRY_SYNONYMS[q]) return INDUSTRY_SYNONYMS[q];

  const keys = Object.keys(INDUSTRY_SYNONYMS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const nk = normalise(k);
    // Word-boundary containment: "plumbing services" hits "plumbing", but "plum" does not.
    if (new RegExp(`(^|\\s)${nk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(q)) {
      return INDUSTRY_SYNONYMS[k];
    }
  }
  return null;
}
