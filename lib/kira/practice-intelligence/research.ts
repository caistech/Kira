// lib/kira/practice-intelligence/research.ts
//
// ONE BOUNDED RESEARCH PASS over a named practice, returning EVIDENCE — never a verdict.
//
// THE DIVISION THIS FILE EXISTS TO HOLD. The tool gathers what is publicly observable and says where
// it got it. Whether any of it constitutes an opportunity is Kira's judgement, made in conversation
// with the owner, and nothing here may pre-empt it: no score, no "qualified", no recommendation to
// make contact. A research function that quietly grades its own findings turns the office-hours
// conversation into a rubber stamp, which is the opposite of what this capability is for.
//
// BOUNDED, NOT CRAWLED. One search, one homepage, at most two interior pages chosen by path, one
// profile extraction, one people extraction. The ceiling is fixed in code rather than left to a
// model, because "keep going until you know enough" is how a conversational tool becomes a
// forty-second silence.
//
// THREE OUTCOMES, KEPT APART (DATA_STANDARD R4). Kira reasons over this result, so the difference
// between "we looked and there is no online booking", "we could not look" and "we looked and found
// the opposite of the hypothesis" changes what she should say. They are separate fields here and
// must stay separate: collapsing a timeout into "no booking system found" would manufacture a sales
// signal out of a network error.

import { braveWebSearch } from '@caistech/brave-search';
import {
  extractProfile,
  fetchPage,
  isExtractionError,
  isFetchPageError,
  stripHtmlToText,
  type BusinessProfile,
} from '@caistech/extractors';

import { createOpenAITextRunner } from '@/lib/kira/structured-runner';
import { detectTechnology, type PageSource, type TechnologyDetection } from './technology-detect';
import { selectInternalPages, selectPracticeWebsite, type SiteSelection } from './site-selection';
import { packFor, supportedSectors, type DomainPack } from './domain-pack';

// ── Budgets. Fixed here so a slow site cannot hold a conversation open. ────────────────────────
const FETCH_TIMEOUT_MS = 8_000;
const MAX_INTERNAL_PAGES = 2;
const SEARCH_RESULTS = 8;
const USER_AGENT = 'KiraPracticeIntelligence/1.0 (+https://corporateaisolutions.com)';
/** Cap on HTML held per page. Generous enough for markup signatures, bounded against a huge page. */
const MAX_HTML_CHARS = 400_000;
/** Text handed to the people extractor. Bounded for cost and latency. */
const MAX_PEOPLE_TEXT = 12_000;

export interface ResearchInput {
  /** The organisation name, as the owner said it. */
  organisation: string;
  /**
   * Which industry's research pack to use. Defaults to healthcare, the only one that exists.
   * An unrecognised sector fails honestly rather than silently researching with the wrong vendor
   * list — see domain-pack.ts.
   */
  sector?: string;
  /** Suburb / city / state — materially improves the search. Optional. */
  location?: string;
  /** Skip the search entirely when the owner already knows the site. */
  website?: string;
  /** What the owner is actually trying to find out. Echoed back, never acted on by the tool. */
  researchQuestion?: string;
}

export type ResearchStage = 'sector' | 'search' | 'site-selection' | 'homepage' | 'interior-pages' | 'profile' | 'people';

export interface ResearchFailure {
  stage: ResearchStage;
  /** Written to be read aloud. Never rewritten into "nothing found". */
  reason: string;
}

/** A person visible on the practice's own public pages. */
export interface ObservedPerson {
  name: string;
  role: string | null;
  /** Which page they appeared on. */
  sourceUrl: string;
}

export interface PracticeResearchResult {
  /** 'ok' = the core evidence was gathered. 'partial' = some stages failed. 'failed' = no evidence. */
  status: 'ok' | 'partial' | 'failed';

  practice: {
    name: string;
    location: string | null;
    website: string | null;
    /** How the website was chosen (or why it wasn't). Printed so a wrong pick is visible. */
    websiteReason: string;
  };

  signal: {
    /** Echo of what the owner asked. The tool does not interpret it. */
    researchQuestion: string | null;
  };

  technology: TechnologyDetection;

  organisation: {
    /** From @caistech/extractors. Null when extraction failed or was skipped. */
    profile: BusinessProfile | null;
    /** Plain statements we can point at a page for. */
    observedFacts: string[];
    /** Things we specifically could not establish. Named, so Kira does not fill them with guesses. */
    unknowns: string[];
  };

  decisionMakers: ObservedPerson[];

  research: {
    pagesFetched: string[];
    failures: ResearchFailure[];
    elapsedMs: number;
    /** Everything the site selector threw away, so "found nothing" is auditable. */
    rejectedResults: SiteSelection['rejected'];
  };

  /** One paragraph for Kira to reason from. Descriptive only — states no conclusion. */
  summary: string;
}

/** Fetch one page, returning null and recording why on failure. */
async function getPage(
  url: string,
  failures: ResearchFailure[],
  stage: ResearchStage,
): Promise<PageSource | null> {
  const page = await fetchPage(url, {
    fetchTimeout: FETCH_TIMEOUT_MS,
    userAgent: USER_AGENT,
    maxChars: MAX_HTML_CHARS,
  });
  if (isFetchPageError(page)) {
    failures.push({
      stage,
      // The distinction the shared package preserves: a status means the server said no; its
      // absence means we never reached it. Both are failures to LOOK, neither is a finding.
      reason: page.status
        ? `${url} answered HTTP ${page.status}`
        : `${url} could not be reached (${page.error.replace(/^Failed to fetch \S+: /, '')})`,
    });
    return null;
  }
  return { url: page.finalUrl, html: page.html };
}

/**
 * Strip an honorific and normalise, so a returned name can be checked against the page.
 *
 * A site writes "Sarah Chen" and a model returns "Dr Sarah Chen"; that is a reasonable elaboration,
 * not an invention, and the guard must not throw it away. Everything else is normalised — case,
 * punctuation, whitespace — because a name that differs from the page only by a comma is the same
 * name, and a guard that rejects it teaches nobody anything.
 */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(dr|doctor|mr|mrs|ms|miss|prof|professor|a\/prof)\.?\s+/i, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Is this person actually WRITTEN on the page we read?
 *
 * THE GUARD THAT SHOULD HAVE EXISTED FROM THE START. Handed a JavaScript shell containing ten
 * characters of text, the extractor below returned two people — plausible names, plausible titles,
 * and a real source URL attached to each — none of which appeared anywhere in the document. The
 * system prompt says "NEVER invent a person". It did anyway, and the failure was invisible from the
 * outside because the fabrication arrived wearing correct provenance.
 *
 * So provenance is no longer taken on trust: the caller VERIFIES it. A model may only surface a name
 * that is present in the text we retrieved. Matching on the surname alone is deliberate — "Sarah
 * Chen" and "Chen, Sarah" and "Dr S. Chen" are one person, and requiring an exact full-name match
 * would drop real people to guard against invented ones.
 */
export function isGroundedInSource(name: string, corpusLower: string): boolean {
  const normalised = normaliseName(name);
  if (!normalised) return false;
  const parts = normalised.split(' ').filter((p) => p.length > 1);
  if (parts.length === 0) return false;
  // The surname is the strongest single token, and the one a page always carries.
  const surname = parts[parts.length - 1];
  return corpusLower.includes(surname);
}

/**
 * Read the people off the team/about pages.
 *
 * A model is used here and that is the right call: a person's name and role is unstructured prose,
 * not a signature, and there is no deterministic rule that separates "Dr Sarah Chen, Practice
 * Principal" from the rest of a paragraph. This is the opposite case from technology detection —
 * which is why THAT one refuses a model and this one uses one.
 *
 * But the model's output is CHECKED against the source before it leaves this function, because a
 * model asked to list people from a page with no people on it will produce some.
 *
 * Returns [] on any failure. Nothing here is load-bearing enough to fail the whole pass.
 */
async function extractPeople(
  pages: readonly PageSource[],
  failures: ResearchFailure[],
  pack: DomainPack,
): Promise<ObservedPerson[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || pages.length === 0) return [];

  const llm = createOpenAITextRunner(apiKey);
  const corpus = pages
    .map((p) => `--- ${p.url} ---\n${stripHtmlToText(p.html, MAX_PEOPLE_TEXT / pages.length)}`)
    .join('\n\n')
    .slice(0, MAX_PEOPLE_TEXT);

  const system =
    `You list people named on ${pack.peoplePromptSubject}. Return ONLY a JSON array of ` +
    '{"name": string, "role": string|null, "sourceUrl": string}. Use the exact URL given in the ' +
    'section header the person appeared under. Include clinicians, practice managers, owners and ' +
    'administrators. NEVER invent a person, a role, or a name that is not written on the page. ' +
    'If nobody is named, return [].';

  try {
    const raw = await llm(system, corpus);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    const proposed = parsed
      .map((p) => p as Record<string, unknown>)
      .filter((p) => typeof p.name === 'string' && p.name.trim())
      .map((p) => ({
        name: String(p.name).trim(),
        role: typeof p.role === 'string' && p.role.trim() ? p.role.trim() : null,
        sourceUrl: typeof p.sourceUrl === 'string' ? p.sourceUrl : pages[0].url,
      }))
      .slice(0, 25);

    // THE GROUNDING CHECK. Everything the model proposed is now verified against the text we
    // actually retrieved, and anything absent from it is dropped.
    const corpusLower = corpus.toLowerCase();
    const grounded = proposed.filter((p) => isGroundedInSource(p.name, corpusLower));
    const droppedCount = proposed.length - grounded.length;

    if (droppedCount > 0) {
      // REPORTED, never silently discarded. A silent filter would fix the symptom and hide the
      // condition — and "the model invented people from this page" is exactly the thing a reader
      // needs to know, because it says the page gave us nothing and something filled the gap.
      failures.push({
        stage: 'people',
        reason:
          `${droppedCount} of ${proposed.length} name(s) offered did not appear anywhere in the ` +
          `retrieved text and were discarded — treat this page as giving us no people, not as ` +
          `having none`,
      });
    }

    return grounded;
  } catch (error) {
    failures.push({
      stage: 'people',
      reason: `could not read the people from the site (${error instanceof Error ? error.message : 'unknown'})`,
    });
    return [];
  }
}

/** Describe what was found, without concluding anything about it. */
function buildSummary(r: Omit<PracticeResearchResult, 'summary'>): string {
  const parts: string[] = [];
  const name = r.practice.name;

  if (!r.practice.website) {
    parts.push(`No website could be identified for ${name} — ${r.practice.websiteReason}.`);
  } else {
    parts.push(`${name}: ${r.practice.website} (${r.practice.websiteReason}).`);
  }

  if (!r.technology.inspected) {
    // The sentence that must never become "no online booking".
    parts.push(
      r.technology.notInspectedReason === 'no-readable-content'
        ? 'Their site loaded but is built to render in the browser, so it served almost no readable text to me. I could not read it, which means nothing is known about their booking technology — that is a limit on me, not a finding about them.'
        : 'No page could be read, so nothing is known about their booking technology — this is a research failure, not a finding.',
    );
  } else {
    const label: Record<string, string> = {
      healthengine: 'Healthengine is in use',
      hotdoc: 'HotDoc is in use',
      other_online_booking: 'an online booking system is in use',
      no_visible_online_booking: 'no online booking system is visible on the pages inspected',
      unknown: 'booking technology could not be determined',
    };
    const adopted = r.technology.detected.filter((d) => d.confidence === 1);
    const named = adopted.map((d) => d.provider).join(', ');
    parts.push(
      `Across ${r.technology.pagesInspected.length} page(s), ${label[r.technology.booking]}` +
        (named ? ` (${named}).` : '.'),
    );
  }

  if (r.organisation.profile) {
    const p = r.organisation.profile;
    const bits: string[] = [];
    if (p.services.length) bits.push(`${p.services.length} service(s) listed`);
    if (p.team_size) bits.push(`team size signal: ${p.team_size}`);
    if (p.address.suburb || p.address.state) {
      bits.push(`located in ${[p.address.suburb, p.address.state].filter(Boolean).join(', ')}`);
    }
    if (bits.length) parts.push(`${bits.join('; ')}.`);
  }

  if (r.decisionMakers.length) {
    parts.push(
      `${r.decisionMakers.length} person/people named publicly: ` +
        r.decisionMakers.slice(0, 5).map((p) => `${p.name}${p.role ? ` (${p.role})` : ''}`).join(', ') +
        (r.decisionMakers.length > 5 ? ', and others.' : '.'),
    );
  } else {
    parts.push('No individuals were named on the pages inspected.');
  }

  if (r.research.failures.length) {
    parts.push(`Parts of the research did not complete: ${r.research.failures.map((f) => f.reason).join('; ')}.`);
  }

  return parts.join(' ');
}

/**
 * Run one bounded research pass.
 *
 * NEVER THROWS. Kira calls this mid-conversation; an exception would surface as her going silent, so
 * every failure is captured into `failures` and reported in the result.
 */
export async function researchOrganisation(input: ResearchInput): Promise<PracticeResearchResult> {
  const startedAt = Date.now();
  const failures: ResearchFailure[] = [];
  const name = input.organisation.trim();
  const location = input.location?.trim() || null;

  // ── 0. Resolve the sector pack ────────────────────────────────────────────────────────────────
  // Before anything is fetched, because researching with the wrong industry's vendor list produces a
  // confident answer about the wrong things. Null is said out loud rather than defaulted away.
  const pack = packFor(input.sector);
  if (!pack) {
    failures.push({
      stage: 'sector',
      reason:
        `I don't have a research pack for "${input.sector}" yet — I can only research ` +
        `${supportedSectors().join(', ')} at the moment. That's a limit on me, not a judgement ` +
        `about them.`,
    });
  }

  let websiteUrl: string | null = null;
  let websiteReason = '';
  let rejected: SiteSelection['rejected'] = [];

  // ── 1. Resolve the website ────────────────────────────────────────────────────────────────────
  if (input.website?.trim()) {
    try {
      websiteUrl = new URL(input.website.trim()).origin;
      websiteReason = 'supplied by the owner';
    } catch {
      failures.push({ stage: 'site-selection', reason: `"${input.website}" is not a usable URL` });
    }
  }

  if (!websiteUrl) {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY;
    if (!apiKey) {
      // Our own misconfiguration, and it must be said as ours. An owner told "nothing found"
      // because an env var is unset has been given a false answer about a real business.
      failures.push({
        stage: 'search',
        reason: 'web search is not configured on my side (no Brave API key) — that is a problem at my end, not a finding about this practice',
      });
    } else {
      try {
        const query = [name, location, pack?.searchQualifier].filter(Boolean).join(' ');
        const results = await braveWebSearch(query, apiKey, { count: SEARCH_RESULTS, country: 'AU' });
        const selection = selectPracticeWebsite(results, pack?.directoryHosts);
        websiteUrl = selection.websiteUrl;
        websiteReason = selection.reason;
        rejected = selection.rejected;
      } catch (error) {
        failures.push({
          stage: 'search',
          reason: `the web search itself failed (${error instanceof Error ? error.message : 'unknown'})`,
        });
      }
    }
  }

  // ── 2. Homepage ───────────────────────────────────────────────────────────────────────────────
  const pages: PageSource[] = [];
  let homepage: PageSource | null = null;
  if (websiteUrl) {
    homepage = await getPage(websiteUrl, failures, 'homepage');
    if (homepage) pages.push(homepage);
  }

  // ── 3. Interior pages + profile, in parallel ──────────────────────────────────────────────────
  // Parallel because the critical path is what a person waits through. Sequentially this is three
  // fetches plus a model call end to end; concurrently it is roughly the slowest one.
  let profile: BusinessProfile | null = null;
  if (homepage && websiteUrl) {
    const candidates = selectInternalPages(homepage.html, websiteUrl, MAX_INTERNAL_PAGES);

    const [interiorResults, profileResult] = await Promise.all([
      Promise.all(candidates.map((u) => getPage(u, failures, 'interior-pages'))),
      (async (): Promise<BusinessProfile | null> => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          failures.push({ stage: 'profile', reason: 'no language model is configured on my side' });
          return null;
        }
        try {
          const result = await extractProfile(websiteUrl, {
            llm: createOpenAITextRunner(apiKey),
            fetchTimeout: FETCH_TIMEOUT_MS,
            userAgent: USER_AGENT,
          });
          if (isExtractionError(result)) {
            failures.push({ stage: 'profile', reason: `profile extraction failed: ${result.error}` });
            return null;
          }
          return result;
        } catch (error) {
          failures.push({
            stage: 'profile',
            reason: `profile extraction failed (${error instanceof Error ? error.message : 'unknown'})`,
          });
          return null;
        }
      })(),
    ]);

    for (const p of interiorResults) if (p) pages.push(p);
    profile = profileResult;
  }

  // ── 4. Deterministic technology detection over everything we read ─────────────────────────────
  const technology = detectTechnology(pages, pack?.signatures);

  // ── 5. People ─────────────────────────────────────────────────────────────────────────────────
  const peoplePages = pack ? pages.filter((p) => pack.peoplePagePattern.test(p.url)) : [];
  const decisionMakers = pack
    ? await extractPeople(peoplePages.length ? peoplePages : pages.slice(0, 1), failures, pack)
    : [];

  // ── 6. Assemble ───────────────────────────────────────────────────────────────────────────────
  const observedFacts: string[] = [];
  const unknowns: string[] = [];

  if (technology.inspected) {
    for (const d of technology.detected.filter((x) => x.confidence === 1)) {
      observedFacts.push(`${d.provider} (${d.category}) referenced on ${d.evidence[0]?.sourceUrl ?? 'the site'}`);
    }
    if (technology.booking === 'no_visible_online_booking') {
      observedFacts.push(`No online booking vendor was referenced on: ${technology.pagesInspected.join(', ')}`);
    }
  } else {
    unknowns.push('Booking technology — no page could be read');
  }

  if (profile) {
    if (profile.hours) observedFacts.push(`Published hours: ${profile.hours}`);
    if (profile.services.length) {
      observedFacts.push(`Services listed: ${profile.services.slice(0, 12).map((s) => s.name).join(', ')}`);
    }
    if (profile.team_size) observedFacts.push(`Team-size signal on the site: ${profile.team_size}`);
  } else {
    unknowns.push('Structured organisation profile — extraction did not complete');
  }

  if (!decisionMakers.length) unknowns.push('Named individuals — nobody was listed on the pages read');
  // Never inferable from a public website, and naming it stops the gap being quietly filled.
  // Sector-specific: a builder has no practice-management system, so this must not be asserted as
  // an open question for every industry.
  if (pack) unknowns.push(...pack.sectorUnknowns);
  unknowns.push('Actual administrative workload — not observable from a website');

  // ── The JavaScript case, said out loud ────────────────────────────────────────────────────────
  // A site that renders in the browser returns markup and no content to us. That is a fact about
  // what WE can see, not a fact about the practice, and it has to travel as one — the failure that
  // produced this branch reported "no online booking" about an organisation with a booking platform
  // at every location, because a shell was mistaken for an empty page.
  if (technology.unreadablePages.length > 0) {
    failures.push({
      stage: 'homepage',
      reason:
        `${technology.unreadablePages.length} page(s) loaded but carried almost no readable text — ` +
        `this is a JavaScript-rendered site I cannot read, so I learned nothing from it: ` +
        `${technology.unreadablePages.join(', ')}`,
    });
  }

  // ── Status, honestly ──────────────────────────────────────────────────────────────────────────
  // 'ok' has to mean "I found things out". A pass that fetched pages and could read none of them
  // learned nothing, and reporting that as success is what let a fabricated answer look verified.
  // `inspected` is the discriminator: it is the one field that says whether anything was read.
  const status: PracticeResearchResult['status'] =
    !pack || pages.length === 0 || !technology.inspected
      ? 'failed'
      : failures.length > 0
        ? 'partial'
        : 'ok';

  const withoutSummary: Omit<PracticeResearchResult, 'summary'> = {
    status,
    practice: {
      name,
      location,
      website: websiteUrl,
      websiteReason: websiteReason || 'no website was identified',
    },
    signal: { researchQuestion: input.researchQuestion?.trim() || null },
    technology,
    organisation: { profile, observedFacts, unknowns },
    decisionMakers,
    research: {
      pagesFetched: pages.map((p) => p.url),
      failures,
      elapsedMs: Date.now() - startedAt,
      rejectedResults: rejected,
    },
  };

  return { ...withoutSummary, summary: buildSummary(withoutSummary) };
}
