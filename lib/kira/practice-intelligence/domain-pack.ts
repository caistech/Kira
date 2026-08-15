// lib/kira/practice-intelligence/domain-pack.ts
//
// THE SEAM BETWEEN THE RESEARCH SPINE AND WHAT IT KNOWS ABOUT AN INDUSTRY.
//
// The spine — search, pick the organisation's own site, fetch a bounded set of pages, match vendor
// signatures in raw markup, extract a profile and the people, report evidence with its provenance —
// is industry-agnostic. Nothing in it is about medicine. What IS about medicine is a short list of
// facts: which booking vendors exist, which directories crowd out a practice's own website, which
// page paths are worth reading, and what a person is called on this kind of site.
//
// Those facts live here, in a pack, keyed by sector. The point is NOT to build a multi-sector
// research product — there is exactly one pack, and that is honest. The point is that the sector is
// a VALUE rather than an assumption baked through five files, so the day a second one is wanted it
// is a new pack and not a fork of the spine.
//
// WHY NOW, WHEN ONLY ONE PACK EXISTS. The tool is generic by name and takes a sector argument. A
// parameter the implementation ignores is worse than no parameter: it tells the model, and the
// person reading the code, that something is configurable when it is not.
//
// AN UNKNOWN SECTOR DEGRADES HONESTLY. `packFor` returns null rather than quietly falling back to
// healthcare, because researching a law firm with a list of dental booking vendors would return
// "no online booking" with total confidence and be worthless — the same class of confidently-wrong
// answer this module's siblings were fixed for.

import { SIGNATURES, type Signature } from './technology-detect';
import { HEALTHCARE_DIRECTORY_HOSTS } from './site-selection';

export interface DomainPack {
  /** The sector key callers pass. Lower-case, hyphenated. */
  sector: string;
  /** Human-facing label, used in messages the owner hears. */
  label: string;
  /**
   * Appended to the web search alongside the organisation name and location. Narrow enough to find
   * the practice rather than an article about the industry.
   */
  searchQualifier: string;
  /** Third-party vendor domains whose presence on a page is evidence of adoption. */
  signatures: readonly Signature[];
  /** Hosts that are directories/aggregators for THIS industry, never an organisation's own site. */
  directoryHosts: readonly string[];
  /** Which fetched pages are worth handing to the people extractor. */
  peoplePagePattern: RegExp;
  /** How to describe the site to the people extractor — "a healthcare practice", "a law firm". */
  peoplePromptSubject: string;
  /**
   * Things this industry's public websites structurally do not reveal. Stated as unknowns so a
   * reader does not fill them with something plausible, and sector-specific so we do not claim a
   * dental practice-management system is an open question for a builder.
   */
  sectorUnknowns: readonly string[];
}

const HEALTHCARE: DomainPack = {
  sector: 'healthcare',
  label: 'healthcare practice',
  searchQualifier: 'medical practice',
  signatures: SIGNATURES,
  directoryHosts: HEALTHCARE_DIRECTORY_HOSTS,
  peoplePagePattern: /(team|about|doctor|practitioner|staff|clinician|dentist)/i,
  peoplePromptSubject: "a healthcare practice's own website",
  sectorUnknowns: [
    'Practice management system (PMS) — not publicly observable unless referenced',
  ],
};

/** Every sector we can actually research today. One, and said plainly. */
export const DOMAIN_PACKS: readonly DomainPack[] = [HEALTHCARE];

/** The default when a caller names no sector — the only pack that exists, and the tool's first use. */
export const DEFAULT_SECTOR = 'healthcare';

/**
 * Resolve a sector to its pack, or null.
 *
 * NULL RATHER THAN A FALLBACK, deliberately. Researching a sector with another sector's vendor list
 * produces a confident "no online booking" that means nothing, which is exactly the failure family
 * this module has already been repaired for once. The caller turns null into a sentence the owner
 * can act on — "I don't have a research pack for that industry yet" — which is true, useful, and
 * unmistakably about us rather than about the organisation.
 */
export function packFor(sector?: string | null): DomainPack | null {
  const key = (sector || DEFAULT_SECTOR).trim().toLowerCase();
  return DOMAIN_PACKS.find((p) => p.sector === key) ?? null;
}

/** For a message that has to list what is available. */
export function supportedSectors(): string[] {
  return DOMAIN_PACKS.map((p) => p.sector);
}
