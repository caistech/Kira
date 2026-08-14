// lib/kira/practice-intelligence/site-selection.ts
//
// PICKING THE PRACTICE'S OWN WEBSITE OUT OF A PAGE OF SEARCH RESULTS.
//
// Lifted, deliberately and with its shape preserved, from investorpilot/src/lib/discovery/
// (`publisher-domains.ts`, `junk-result-filter.ts`, `clean-company-name.ts`). That code is in
// production and each rule in it was paid for by a real incident — the sharpest being that a web
// search for a business returns ARTICLES ABOUT businesses, so enriching the top result gets you a
// journalist rather than the practice. The same failure applies exactly here: a search for a medical
// centre returns healthdirect listings, "Top 10 GPs in Perth" listicles and news pieces long before
// it returns the practice's own site.
//
// SHAPE PRESERVED ON PURPOSE. Function names and signatures mirror InvestorPilot's so that when a
// third consumer appears these can be lifted into `@caistech/*` as a move rather than a rewrite
// (SHARED_SERVICES "convergent shape, then extract"). This is occurrence two; do not redesign it.
//
// Everything here is deterministic. No model decides which link is the practice's website.

/**
 * Hosts that are never a practice's own website.
 *
 * Manually curated rather than heuristic, for the reason InvestorPilot's version records: a
 * "looks like a directory" heuristic over-rejects, and a practice's own site occasionally looks
 * directory-shaped. AU health directories and aggregators dominate these results, so they lead.
 */
const NON_PRACTICE_HOSTS = new Set<string>([
  // AU health directories / aggregators — the main noise source for this vertical
  'healthdirect.gov.au', 'healthengine.com.au', 'hotdoc.com.au', 'healthshare.com.au',
  'whitecoat.com.au', 'ratemds.com', 'yellowpages.com.au', 'truelocal.com.au',
  'localsearch.com.au', 'startlocal.com.au', 'hotfrog.com.au', 'aushealthdirectory.com.au',
  'myhealth1st.com.au', '1stavailable.com.au', 'medicaldirectory.com.au',
  'health.gov.au', 'servicesaustralia.gov.au', 'ahpra.gov.au', 'racgp.org.au',
  // Jobs boards — the signal's own source; never the practice's website
  'indeed.com', 'au.indeed.com', 'seek.com.au', 'jora.com', 'adzuna.com.au',
  'glassdoor.com.au', 'linkedin.com', 'ethicaljobs.com.au', 'careerone.com.au',
  // Social / maps / general
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'youtube.com', 'tiktok.com',
  'google.com', 'google.com.au', 'goo.gl', 'maps.app.goo.gl', 'wikipedia.org',
  // Press
  'abc.net.au', 'news.com.au', 'smh.com.au', 'theage.com.au', 'theguardian.com',
  'watoday.com.au', 'perthnow.com.au', 'thewest.com.au', 'medicalrepublic.com.au',
  'ausdoc.com.au', 'medianet.com.au',
]);

/** Exact host or a subdomain of it. */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Is this host a directory, jobs board, press outlet or social network rather than a practice? */
export function isNonPracticeHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  for (const d of NON_PRACTICE_HOSTS) if (hostMatches(host, d)) return true;
  return false;
}

/**
 * Article-shaped results, by title and by URL path.
 *
 * Trimmed from InvestorPilot's list to the patterns that actually fire in this vertical. The
 * number-prefix rule earns its place here as much as there — "7 Best Medical Centres in Joondalup"
 * is the archetypal result for any "<suburb> medical centre" query.
 */
const JUNK_TITLE_PATTERNS: RegExp[] = [
  /^\s*\d+\s+[A-Z]/,
  /\b(top|best|largest|leading|finest)\s+\d+/i,
  /\b\d+\s+(top|best|leading)\b/i,
  /^a\s+(review|guide|comprehensive|complete)\s+(of|to)/i,
  /^(what|how|why|when|where|which|who|does|do|is|are|can|should)\s+(is|to|do|are|the|you|i|we|a|an)\b/i,
  /\b(jobs?|vacanc(y|ies)|hiring|careers?|salary|salaries)\b/i,
  /\b(reviews?|ratings?)\s*(and|&)?\s*(bookings?)?\s*$/i,
];

const JUNK_PATH_PATTERNS: RegExp[] = [
  /\/blogs?\//i, /\/news\//i, /\/articles?\//i, /\/insights?\//i,
  /\/jobs?\//i, /\/careers?\//i, /\/directory\//i, /\/listings?\//i,
];

/** Article, listicle or job ad rather than a practice's own site. */
export function looksLikeJunkResult(title: string | null | undefined, url: string | null | undefined): boolean {
  const t = (title ?? '').trim();
  if (t && JUNK_TITLE_PATTERNS.some((re) => re.test(t))) return true;

  const u = (url ?? '').trim();
  if (u && JUNK_PATH_PATTERNS.some((re) => re.test(u))) return true;

  return false;
}

export interface SearchResultLike {
  title: string;
  url: string;
  description?: string;
}

export interface SiteSelection {
  /** Origin of the chosen site (scheme + host), or null when nothing survived the filters. */
  websiteUrl: string | null;
  /** Why — printed back to the model so a wrong pick is visible rather than mysterious. */
  reason: string;
  /** What was rejected, so "we found nothing" can be told apart from "we filtered everything out". */
  rejected: Array<{ url: string; why: string }>;
}

/**
 * Choose the practice's own website from search results.
 *
 * Deliberately conservative: it returns null rather than guessing. A wrong website is worse than no
 * website here, because everything downstream — technology detection, the people, the whole
 * write-up — would then describe a DIFFERENT ORGANISATION while looking perfectly confident.
 *
 * Normalised to the ORIGIN, not the matched page, because the deep link a search engine returns is
 * usually an interior page and the crawl below wants a base to resolve candidates against.
 */
export function selectPracticeWebsite(results: readonly SearchResultLike[]): SiteSelection {
  const rejected: Array<{ url: string; why: string }> = [];

  for (const r of results) {
    const host = hostnameOf(r.url);
    if (!host) {
      rejected.push({ url: r.url, why: 'unparseable url' });
      continue;
    }
    if (isNonPracticeHost(host)) {
      rejected.push({ url: r.url, why: `directory / jobs board / press host (${host})` });
      continue;
    }
    if (looksLikeJunkResult(r.title, r.url)) {
      rejected.push({ url: r.url, why: 'article, listicle or job-ad shaped result' });
      continue;
    }
    try {
      const origin = new URL(r.url).origin;
      return {
        websiteUrl: origin,
        reason: `first result on a non-directory host (${host})`,
        rejected,
      };
    } catch {
      rejected.push({ url: r.url, why: 'unparseable url' });
    }
  }

  return {
    websiteUrl: null,
    reason: results.length
      ? 'every result was a directory, jobs board, press article or listicle'
      : 'the search returned no results',
    rejected,
  };
}

/**
 * Interior pages worth reading, ranked.
 *
 * Bounded and ordered rather than crawled: the directive is explicit that we do not walk a whole
 * site, and the evidence we need clusters on a handful of predictable paths. Appointments/booking
 * lead because that is where a booking widget lives when it is not on the homepage — the exact case
 * that makes homepage-only inspection misreport a Healthengine practice.
 */
const CANDIDATE_PATH_HINTS: Array<{ re: RegExp; label: string }> = [
  { re: /(appointment|booking|book-online|book-now|make-a-booking)/i, label: 'appointments' },
  { re: /(our-team|the-team|our-doctors|doctors|clinicians|practitioners|staff|about-us|about)/i, label: 'team/about' },
  { re: /(services|what-we-do|specialt)/i, label: 'services' },
  { re: /(contact|find-us|locations?)/i, label: 'contact' },
];

/**
 * Pull same-site candidate page URLs out of a homepage, ranked and de-duplicated.
 *
 * Same-origin only. Following an off-site link would take the crawl to a directory or a vendor and
 * then attribute whatever it found there to this practice.
 */
export function selectInternalPages(homepageHtml: string, baseUrl: string, limit = 2): string[] {
  let baseHost: string | null = null;
  try {
    baseHost = new URL(baseUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return [];
  }

  const seen = new Set<string>();
  const ranked: Array<{ url: string; rank: number }> = [];

  for (const m of homepageHtml.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    let resolved: URL;
    try {
      resolved = new URL(m[1], baseUrl);
    } catch {
      continue;
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue;

    const host = resolved.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== baseHost) continue;

    resolved.hash = '';
    const href = resolved.toString();
    if (seen.has(href)) continue;

    const rank = CANDIDATE_PATH_HINTS.findIndex((h) => h.re.test(resolved.pathname));
    if (rank === -1) continue;

    seen.add(href);
    ranked.push({ url: href, rank });
  }

  ranked.sort((a, b) => a.rank - b.rank);
  return ranked.slice(0, limit).map((r) => r.url);
}
