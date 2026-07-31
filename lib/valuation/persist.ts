// lib/valuation/persist.ts
//
// Where a valuation in progress, and a finished one, are kept between pages and between visits.
//
// THE PROMISE CAME FIRST. /business-valuation tells the owner, above the first question, that his
// answers are "kept on this device as you go, so you can stop and come back". They were kept in
// sessionStorage, which is per-tab: close it and eleven questions are gone. Two testers found it the
// same evening from opposite ends — one as a broken promise, one as "let me think about it
// overnight" losing the price.
//
// WHY THE ORIGINAL CHOICE WAS DEFENSIBLE, AND WHY IT CHANGES. These answers include annual turnover
// and profit, and localStorage leaves them on the machine with nothing to clear them — a real
// concern on a shared computer. That risk is now bounded and disclosed rather than avoided: the data
// expires on its own, and the page carries a visible control to erase it.
//
// AND IT IS NOT ONLY ABOUT CONVENIENCE. The valuation is the BASELINE — /api/valuation/claim
// attaches it to the account at signup, first-valuation-wins, and every later movement the owner and
// his introducer see is measured from it. Claim can only attach what the browser still holds. So a
// tab closed between the result and the signup did not merely cost a page of typing: it cost the
// origin of the whole gap-closing measurement, or replaced it with a later re-run that quietly
// reads as his starting point.
//
// Nothing is sent anywhere. This is still local-only until he signs up and claim runs.

/** How long a valuation is kept. Long enough for "I'll think about it overnight", not indefinite. */
export const VALUATION_TTL_DAYS = 7;

const TTL_MS = VALUATION_TTL_DAYS * 24 * 60 * 60 * 1000;

interface Envelope<T> {
  savedAt: number;
  expiresAt: number;
  data: T;
}

/**
 * Save, with an expiry stamped in.
 *
 * The expiry travels WITH the value rather than being enforced by a cleanup job, because there is no
 * such job on a static page: a browser that never returns is a browser that never runs one. Written
 * this way, a value is dead the moment it is next read, even if that is a year later.
 */
export function saveValuationLocal<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: Envelope<T> = { savedAt: Date.now(), expiresAt: Date.now() + TTL_MS, data };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* private browsing or a full quota — the visitor simply loses resume, which is survivable */
  }
}

/**
 * Read, honouring the expiry — and clean up on the way past.
 *
 * An expired entry is DELETED rather than merely ignored. Ignoring it would leave someone's turnover
 * sitting in the browser store forever while the product behaved as though it were gone, which is
 * the worst of both: no resume, and the disclosure risk the original sessionStorage choice existed
 * to avoid.
 */
export function loadValuationLocal<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Envelope<T>>;
    // An envelope with no expiry is from the sessionStorage era or a hand-edited store. Refuse it
    // rather than treating a missing expiry as "never expires" — the fail-open reading of a missing
    // field is how a bounded risk quietly becomes an unbounded one.
    if (typeof parsed?.expiresAt !== 'number' || parsed.data === undefined) {
      window.localStorage.removeItem(key);
      return null;
    }
    if (Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.data as T;
  } catch {
    return null;
  }
}

/** Erase it. Behind a visible control, because "you can clear this" has to be true to be worth saying. */
export function clearValuationLocal(...keys: string[]): void {
  if (typeof window === 'undefined') return;
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
      // The sessionStorage copies are cleared too. Anything written before this change is still
      // sitting in the old store, and a "clear my answers" control that leaves the previous
      // generation of the same data behind is not telling the truth.
      window.sessionStorage.removeItem(key);
    } catch {
      /* nothing to do */
    }
  }
}

/** When the saved copy expires, for telling the owner how long he has. Null when nothing is saved. */
export function valuationExpiresAt(key: string): Date | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Envelope<unknown>>;
    return typeof parsed?.expiresAt === 'number' ? new Date(parsed.expiresAt) : null;
  } catch {
    return null;
  }
}
