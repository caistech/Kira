// lib/kira/practice-intelligence/technology-detect.ts
//
// WHICH BOOKING / PRACTICE SYSTEM DOES THIS PRACTICE ACTUALLY USE — decided by looking at the
// markup, never by asking a model.
//
// WHY DETERMINISTIC, AND WHY THIS IS THE LOAD-BEARING PART. The Healthengine answer does not merely
// colour the write-up: it ROUTES the prospect. A practice on Healthengine is not approached about an
// AI receptionist at all — it becomes evidence for the platform conversation instead. A detector
// that answers differently on Tuesday would send real outreach to the wrong party, so this is a
// lookup and it must behave like one: same page in, same verdict out, every time.
//
// AND WHY IT NEEDS RAW HTML. A booking provider is identified by a `<script src>`, a `<link href>`,
// an iframe or an anchor pointing at the vendor's own host. `stripHtmlToText` deletes `<script>`
// blocks first and every tag after that, so the evidence is gone before a text-based reader ever
// sees it. That is the whole reason @caistech/extractors 0.3.0 exports fetchPage.
//
// THE RULE ABOUT WORDING. "Book online" is not evidence. Every practice site in the country says it,
// including the ones that mean "phone us". Nothing here matches page COPY — every signal is a URL or
// a host, which is why each piece of evidence can be printed back and checked by a human.
//
// OBSERVED FACT vs INTERPRETATION. This module returns only what it saw and where it saw it. It does
// not say whether that is an opportunity; that judgement is Kira's, over in the conversation.

/** The five states the capability contract asks for. */
export type BookingStatus =
  | 'healthengine'
  | 'hotdoc'
  | 'other_online_booking'
  | 'no_visible_online_booking'
  /** We could not look. NEVER the same as "nothing found" — see `inspected`. */
  | 'unknown';

export type TechCategory = 'booking' | 'pms' | 'ai_receptionist';

/** Where a match came from. Kept so a human can re-check any conclusion against the page. */
export type EvidenceWhere = 'url-reference' | 'text-mention';

export interface TechEvidence {
  /** The matched URL or host, verbatim (bounded). */
  match: string;
  where: EvidenceWhere;
  /** Which page it was found on. */
  sourceUrl: string;
}

export interface ProviderDetection {
  /** Vendor slug — 'healthengine', 'hotdoc', 'cliniko', … */
  provider: string;
  category: TechCategory;
  /**
   * 1.0 = the page links to or loads something from the vendor's host — the practice is using it.
   * 0.5 = the vendor's domain appears only as text. That is a MENTION, which a blog post about
   *       online booking also produces, so it is reported but never treated as adoption.
   */
  confidence: number;
  evidence: TechEvidence[];
}

export interface TechnologyDetection {
  booking: BookingStatus;
  /** Everything recognised, across all categories, strongest first. */
  detected: ProviderDetection[];
  /**
   * FALSE when no page could be READ — either nothing was fetched, or what came back had markup but
   * no readable content. The caller must not report 'no_visible_online_booking' in that case; it
   * would turn a fetch failure, or a page we cannot see, into a finding about the practice.
   */
  inspected: boolean;
  /**
   * WHY nothing was inspected. Present only when `inspected` is false, and the two values send a
   * reader somewhere completely different: 'no-pages' means we never got a response,
   * 'no-readable-content' means we got one and it was empty of text.
   */
  notInspectedReason?: 'no-pages' | 'no-readable-content';
  /** Pages actually inspected. */
  pagesInspected: string[];
  /**
   * Pages fetched successfully but carrying no readable text — almost always a JavaScript-rendered
   * site. Named separately because "we could not read this site" is a fact worth SAYING, and it is
   * not the same fact as "this practice has no online booking".
   */
  unreadablePages: string[];
}

/**
 * The signature table.
 *
 * Matched on HOST (exact or as a parent domain), not on a substring of the whole document, because a
 * substring match on "hotdoc" would fire on the word inside unrelated prose and on any host that
 * merely contains it. Parent-domain matching means `book.hotdoc.com.au` counts and
 * `nothotdoc.example.com` does not.
 *
 * ⚠️ SEED LIST, HONESTLY LABELLED. These are the vendor domains as documented publicly; they have
 * NOT been verified against captured markup from live practice sites (that needs live fetches,
 * excluded from this phase). Treat additions as cheap and expect the AU allied-health tail to be
 * incomplete. An unrecognised vendor degrades to `other_online_booking` with the host as evidence —
 * it does not silently become "no booking", which is the failure that would matter.
 */
interface Signature {
  provider: string;
  category: TechCategory;
  domains: string[];
}

export const SIGNATURES: readonly Signature[] = [
  // ── The two that decide routing ──────────────────────────────────────────────────────────────
  { provider: 'healthengine', category: 'booking', domains: ['healthengine.com.au', 'healthengine.com'] },
  { provider: 'hotdoc', category: 'booking', domains: ['hotdoc.com.au', 'hotdoc.com'] },

  // ── Other AU booking platforms ───────────────────────────────────────────────────────────────
  { provider: 'automed', category: 'booking', domains: ['automedsystems.com.au'] },
  { provider: 'myhealth1st', category: 'booking', domains: ['myhealth1st.com.au', '1stavailable.com.au'] },
  { provider: 'appointuit', category: 'booking', domains: ['appointuit.com'] },
  { provider: 'healthshare', category: 'booking', domains: ['healthshare.com.au'] },
  { provider: 'cliniko', category: 'booking', domains: ['cliniko.com'] },
  { provider: 'halaxy', category: 'booking', domains: ['halaxy.com'] },
  { provider: 'nookal', category: 'booking', domains: ['nookal.com'] },
  { provider: 'coreplus', category: 'booking', domains: ['coreplus.com.au'] },
  { provider: 'poweRdiary', category: 'booking', domains: ['powerdiary.com'] },
  { provider: 'janeapp', category: 'booking', domains: ['janeapp.com'] },
  { provider: 'simplybook', category: 'booking', domains: ['simplybook.me', 'simplybook.it'] },
  { provider: 'calendly', category: 'booking', domains: ['calendly.com'] },

  // ── Practice management systems (rarely public-facing; recorded when they are) ────────────────
  { provider: 'best-practice', category: 'pms', domains: ['bpsoftware.net'] },
  { provider: 'medical-director', category: 'pms', domains: ['medicaldirector.com'] },
  { provider: 'zedmed', category: 'pms', domains: ['zedmed.com.au'] },
  { provider: 'genie-gentu', category: 'pms', domains: ['geniesolutions.com.au', 'gentu.com.au'] },
  { provider: 'clinic-to-cloud', category: 'pms', domains: ['clinictocloud.com'] },
  { provider: 'shexie', category: 'pms', domains: ['shexie.com.au'] },

  // ── AI receptionist / voice automation ───────────────────────────────────────────────────────
  { provider: 'smith-ai', category: 'ai_receptionist', domains: ['smith.ai'] },
  { provider: 'slang-ai', category: 'ai_receptionist', domains: ['slang.ai'] },
  { provider: 'goodcall', category: 'ai_receptionist', domains: ['goodcall.com'] },
  { provider: 'curogram', category: 'ai_receptionist', domains: ['curogram.com'] },
  { provider: 'hello-patient', category: 'ai_receptionist', domains: ['hellopatient.com'] },
];

/**
 * Hosts that are never a booking system, so an off-domain link to one must not be read as
 * "some unknown booking provider". Social and maps links are on essentially every practice site.
 */
const NON_BOOKING_HOSTS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com',
  'google.com', 'google.com.au', 'goo.gl', 'maps.app.goo.gl', 'apple.com', 'tiktok.com',
  'healthdirect.gov.au', 'health.gov.au', 'servicesaustralia.gov.au', 'ahpra.gov.au',
  'wordpress.com', 'wix.com', 'squarespace.com', 'godaddy.com', 'cloudflare.com',
  'googletagmanager.com', 'google-analytics.com', 'gstatic.com', 'googleapis.com',
  'jquery.com', 'jsdelivr.net', 'unpkg.com', 'bootstrapcdn.com', 'fontawesome.com',
  // Tag/analytics hosts observed on real practice sites. `facebook.net` is a DIFFERENT domain from
  // `facebook.com` and was not covered by it — belt-and-braces alongside the word boundary above,
  // since the boundary is the actual fix and this list can only ever cover what someone has seen.
  'facebook.net', 'fbcdn.net', 'doubleclick.net', 'googlesyndication.com',
  'hotjar.com', 'clarity.ms', 'cloudfront.net',
];

/**
 * Path/word signals that a link is about making an appointment. URL-only — never page copy.
 *
 * ⚠️ THE LEADING BOUNDARY IS THE WHOLE POINT. Without it this matched "book" inside **face**book**,
 * so `connect.facebook.net/en_US/fbevents.js` and a Wix CSS bundle named `[WFacebookLike]` both
 * registered as unrecognised booking systems. Two of ten real practice sites were misclassified that
 * way, and always in the same direction: a practice with NO online booking reported as having some.
 * That is the single most commercially load-bearing verdict this module produces — it is the
 * strongest direct-prospect signal — so a false positive there quietly buries the best leads.
 *
 * `reserv` rather than `reserve` so "reservation" is caught; `schedul` covers schedule/scheduling.
 */
const BOOKING_URL_HINTS = /(^|[^a-z])(book|appointment|appt|schedul|reserv)/i;

/**
 * The floor for "we could actually read this page".
 *
 * A JavaScript-rendered site returns plenty of MARKUP and no CONTENT: the case that produced this
 * constant served 33,737 bytes of HTML containing ten characters of visible text. Byte length is
 * therefore not evidence that anything was read, and treating it as evidence is what let a fetch
 * that learned nothing be reported as a successful inspection.
 *
 * 200 is deliberately modest. A real practice homepage runs to thousands; anything under a couple of
 * hundred characters is a shell, a challenge page or an error, none of which we may draw conclusions
 * from.
 */
export const MIN_VISIBLE_TEXT_CHARS = 200;

/**
 * Visible text length, for the floor above.
 *
 * Strips the same three block elements `stripHtmlToText` does and then all tags. It is deliberately
 * a LOCAL, cheap measure rather than a call into the shared extractor: this module is otherwise pure
 * and dependency-free, and all it needs is an order-of-magnitude answer to "is there any prose
 * here?" — not a faithful text rendering.
 */
export function visibleTextLength(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

function hostOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Exact host, or a subdomain of it. Never a bare substring — see the SIGNATURES note. */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Every absolute URL in the document.
 *
 * Deliberately taken from the RAW HTML rather than from parsed anchors: the evidence we care about
 * most often lives in `<script src>`, `<iframe src>` and `<link href>`, and a widget is frequently
 * injected by a script tag rather than written as a link. A regex over the source sees all of them.
 */
export function extractUrls(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>()\\]+/gi)) {
    // Trim trailing punctuation that commonly rides along in markup and prose.
    found.add(m[0].replace(/[.,;:!?)\]]+$/, ''));
  }
  return [...found];
}

/** One page's worth of raw markup, plus where it came from. */
export interface PageSource {
  url: string;
  html: string;
}

/**
 * Inspect one or more pages and report what is demonstrably there.
 *
 * Pass every page you retrieved. Evidence is merged across them, because a practice commonly puts
 * the booking widget on an /appointments page and nothing on the homepage — inspecting only the
 * homepage is how a Healthengine practice gets misread as having no online booking.
 */
export function detectTechnology(pages: readonly PageSource[]): TechnologyDetection {
  const fetched = pages.filter((p) => typeof p.html === 'string' && p.html.length > 0);

  // READABLE, not merely present. Byte length proves a response arrived, nothing more.
  const usable = fetched.filter((p) => visibleTextLength(p.html) >= MIN_VISIBLE_TEXT_CHARS);
  const unreadablePages = fetched.filter((p) => !usable.includes(p)).map((p) => p.url);

  if (usable.length === 0) {
    // Could not look. Say so — this is the distinction the whole module exists to protect, and the
    // reason distinguishes "nothing came back" from "something came back and was unreadable".
    return {
      booking: 'unknown',
      detected: [],
      inspected: false,
      notInspectedReason: fetched.length === 0 ? 'no-pages' : 'no-readable-content',
      pagesInspected: [],
      unreadablePages,
    };
  }

  /** provider → its accumulating detection. */
  const byProvider = new Map<string, ProviderDetection>();

  const record = (sig: Signature, ev: TechEvidence, confidence: number) => {
    const existing = byProvider.get(sig.provider);
    if (!existing) {
      byProvider.set(sig.provider, {
        provider: sig.provider,
        category: sig.category,
        confidence,
        evidence: [ev],
      });
      return;
    }
    // A URL reference anywhere outranks a text mention everywhere.
    existing.confidence = Math.max(existing.confidence, confidence);
    if (existing.evidence.length < 5) existing.evidence.push(ev);
  };

  /** Off-domain hosts that look like a booking destination but match no known vendor. */
  const unknownBookingHosts = new Map<string, TechEvidence>();

  for (const page of usable) {
    const pageHost = hostOf(page.url);
    const urls = extractUrls(page.html);

    for (const url of urls) {
      const host = hostOf(url);
      if (!host) continue;

      let matchedVendor = false;
      for (const sig of SIGNATURES) {
        if (sig.domains.some((d) => hostMatches(host, d))) {
          record(sig, { match: url.slice(0, 300), where: 'url-reference', sourceUrl: page.url }, 1);
          matchedVendor = true;
        }
      }
      if (matchedVendor) continue;

      // An unrecognised THIRD-PARTY host on a booking-shaped URL. Still a URL signal, not wording:
      // the practice is sending patients somewhere else to make an appointment, and we simply do not
      // know that vendor yet. Reported so the gap is visible rather than silently becoming "none".
      const isThirdParty = !!pageHost && !hostMatches(host, pageHost) && !hostMatches(pageHost, host);
      const isBookingShaped = BOOKING_URL_HINTS.test(url);
      const isBenign = NON_BOOKING_HOSTS.some((h) => hostMatches(host, h));
      if (isThirdParty && isBookingShaped && !isBenign && !unknownBookingHosts.has(host)) {
        unknownBookingHosts.set(host, {
          match: url.slice(0, 300),
          where: 'url-reference',
          sourceUrl: page.url,
        });
      }
    }

    // Bare domain mentioned in the markup without being a URL — e.g. "we use HotDoc" in prose, or a
    // domain inside a data attribute. Recorded at half confidence and never enough on its own.
    for (const sig of SIGNATURES) {
      for (const domain of sig.domains) {
        if (byProvider.get(sig.provider)?.confidence === 1) continue;
        if (page.html.toLowerCase().includes(domain)) {
          record(
            sig,
            { match: domain, where: 'text-mention', sourceUrl: page.url },
            0.5,
          );
        }
      }
    }
  }

  const detected = [...byProvider.values()].sort((a, b) => b.confidence - a.confidence);

  // ── Resolve the booking status ───────────────────────────────────────────────────────────────
  // Only a confidence-1 (URL) match decides adoption. A text mention is reported in `detected` and
  // deliberately does NOT set the status: a page that merely names HotDoc has not told us the
  // practice uses it.
  const adopted = detected.filter((d) => d.category === 'booking' && d.confidence === 1);

  let booking: BookingStatus;
  if (adopted.some((d) => d.provider === 'healthengine')) {
    booking = 'healthengine';
  } else if (adopted.some((d) => d.provider === 'hotdoc')) {
    booking = 'hotdoc';
  } else if (adopted.length > 0) {
    booking = 'other_online_booking';
  } else if (unknownBookingHosts.size > 0) {
    booking = 'other_online_booking';
  } else {
    booking = 'no_visible_online_booking';
  }

  // Surface the unknown vendors as a detection so the evidence travels with the verdict.
  for (const [host, ev] of unknownBookingHosts) {
    detected.push({
      provider: `unrecognised:${host}`,
      category: 'booking',
      confidence: 1,
      evidence: [ev],
    });
  }

  return {
    booking,
    detected,
    inspected: true,
    pagesInspected: usable.map((p) => p.url),
    unreadablePages,
  };
}
