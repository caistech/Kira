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
  builder: 'Heavy Construction',
  building: 'Heavy Construction',
  construction: 'Heavy Construction',
  carpenter: 'Painting & Trade Contracting',
  carpentry: 'Painting & Trade Contracting',
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
  earthmoving: 'Heavy Construction',
  excavation: 'Heavy Construction',
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
