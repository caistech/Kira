// lib/valuation/share.ts
//
// How a completed valuation travels from the result screen to the sales page and on into checkout.
//
// It used to travel in the URL — `/plan?v=<base64 of the answers>`. base64 is not encryption; it is
// a reversible encoding anyone can paste into a decoder. So the owner's annual turnover, profit and
// owner-dependence rode in a link that lands in browser history, in the Referer header of every
// outbound click, in server and proxy logs, and — the case that actually bites — in the email chain
// when someone forwards "look what this said about my business" to their accountant.
//
// None of that was needed. Both ends are client components in the SAME TAB, one navigation apart.
// sessionStorage carries it without the figures ever entering a URL.
//
// It was sessionStorage, per-tab, on the reasoning that a figure this sensitive should die with the
// tab. Two things overturned that. The page PROMISES the answers are kept "so you can stop and come
// back", and per-tab makes that untrue. And the valuation is the BASELINE: /api/valuation/claim
// attaches it to the account at signup, first-valuation-wins, so a tab closed between the result and
// the signup does not cost a page of typing — it costs the origin every later movement is measured
// from, or replaces it with a re-run that quietly reads as his starting point.
//
// So it now persists locally with an expiry and a visible way to erase it (lib/valuation/persist.ts).
// The disclosure risk is bounded and disclosed rather than avoided, which is the trade the copy on
// screen was already describing.
//
// ⚠️ ITS OWN, SHORTER EXPIRY — VALUATION_HANDOFF_TTL_DAYS, not the 7-day resume window. Those two
// stores shared one lifetime because they share this file, which was never a decision. They are not
// the same risk: half-answered questions are his own notes, while THIS is his turnover, his profit
// and the fact he is thinking of selling, waiting to become some account's permanent baseline. A
// naive tester ran the valuation anonymously, signed in, and it attached itself with no
// confirmation — on a machine his bookkeeper uses. The claim now asks him outright
// (components/ClaimStoredValuation.tsx); this shortens the window it can be asked about at all.
//
// `decodeValuationParam` is KEPT — links already sent still work — but nothing generates them now.

import type { ValuationInputs } from './model';
import { clearValuationLocal, loadValuationLocal, saveValuationLocal, VALUATION_HANDOFF_TTL_DAYS } from './persist';

export interface ValuationPayload {
  inputs: ValuationInputs;
  currency: string;
  /**
   * True when this was run from INSIDE the signed-in app (the dashboard's "set your starting point"
   * card, which links with `?from=app`).
   *
   * It exists to switch off a question that becomes absurd in that case. `ClaimStoredValuation` asks
   * "there's a valuation saved on this device — is it yours, or did someone else use this computer?"
   * That is exactly right for an anonymous run: the handoff persists on the DEVICE for seven days,
   * and on a shared office machine the next person to sign in would otherwise inherit someone's
   * turnover as their own permanent baseline. A tester asked for that guard and he was right.
   *
   * But he then hit the other side of it: he started the valuation from a button on his own
   * dashboard, signed in as himself, and ninety seconds later was asked whether it was his. "Asking
   * whether it's mine is right when someone does it logged out, and odd when the app watched me do
   * it." The app did watch him do it — this flag is that knowledge, carried the one hop it needs to
   * travel.
   */
  fromApp?: boolean;
  /**
   * What he asked to be called, given on the valuation intro. Optional — he can skip it.
   *
   * IT LIVES HERE RATHER THAN IN ValuationInputs because it is not an input to the maths, exactly
   * like `currency` above it. It travels with the valuation because that is the first and only
   * moment the product ever hears his name from HIM.
   *
   * Everything else was inference. `onboarding/complete` derived the name from
   * `session.customer_details.name` — the name on the CARD — falling back to the local part of the
   * email address. That produced "shhahhussain" for one owner and, on accounts where a Stripe test
   * customer paid, greeted two different people as "Andrew D Romeo". The failure that matters in
   * production is quieter: the cardholder and the owner are often not the same person. A wife's
   * card, a company card, an accountant setting it up — and Kira spends the rest of her life
   * greeting him by the name on the payment method, baked permanently into her prompt at provision.
   */
  firstName?: string;
}

/** Where the valuation is parked between the two pages, and between visits. */
export const VALUATION_HANDOFF_KEY = 'kira_valuation_handoff';
const STORAGE_KEY = VALUATION_HANDOFF_KEY;

/** Park the valuation for the next page. No-op (and never throws) outside a browser. */
export function storeValuation(payload: ValuationPayload): void {
  // Its OWN, shorter lifetime — not the resume window. See VALUATION_HANDOFF_TTL_DAYS: this is his
  // turnover, his profit and the fact he is thinking of selling, waiting on the device to become
  // some account's permanent baseline. It only has to survive result → signup.
  saveValuationLocal(STORAGE_KEY, payload, VALUATION_HANDOFF_TTL_DAYS);
}

/**
 * Read a parked valuation.
 *
 * Still falls back to the old sessionStorage location, so a visitor who ran the valuation before
 * this change and comes back in the same tab is not told to start again. Read-only: the old copy is
 * left where it is and expires with the tab, and anything written from here on goes to the new store.
 */
export function readStoredValuation(): ValuationPayload | null {
  const fresh = loadValuationLocal<unknown>(STORAGE_KEY);
  if (fresh) return validate(fresh);
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? validate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Clear the handoff — e.g. once checkout has captured it, or when he asks. */
export function clearStoredValuation(): void {
  clearValuationLocal(STORAGE_KEY);
}

function validate(parsed: unknown): ValuationPayload | null {
  const candidate = parsed as ValuationPayload | null;
  if (candidate && candidate.inputs && typeof candidate.inputs.annualProfit === 'number') {
    return candidate;
  }
  return null;
}

/**
 * Decode the legacy `?v=` parameter.
 *
 * RETAINED FOR LINKS ALREADY IN THE WILD ONLY. Nothing produces these any more — see the note at
 * the top of this file. Do not reach for this to build a new link; use `storeValuation`.
 */
export function decodeValuationParam(s: string | null | undefined): ValuationPayload | null {
  if (!s) return null;
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return validate(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
