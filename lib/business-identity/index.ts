// The owner's business identity — the domain half, pure and testable.
//
// This is the data that decides whose name is on outbound mail. Kira sends on behalf of the OWNER'S
// business, so the Spam Act identification footer carries HIS entity and ABN, never Corporate AI
// Solutions'. Putting ours on a client's quote is the white-label failure PRODUCT_STANDARDS §9
// exists to prevent, and it is worse than a missing footer because it is confidently wrong.
//
// Nothing here touches a database or the network — see ./sync for the orchestrator push, and
// ../../app/setup/business/actions.ts for the write. Keeping validation pure is what lets the rules
// below be tested without a Supabase or an orchestrator standing up.

import { validateAbn, formatAbn } from '@caistech/abn-lookup';

/** The only jurisdiction we are cleared to send email in (PRODUCT_STANDARDS §9 jurisdiction guard). */
export const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] as const;
export type AuState = (typeof AU_STATES)[number];

/**
 * Which clock a date should be read in, from the state we already hold.
 *
 * THE BUG THIS FIXES, found by pulling the real document off production on 2026-08-05: every date
 * was rendered on a UTC server with `toLocaleDateString('en-AU')`, so for the EIGHT HOURS between
 * Perth midnight and UTC midnight — a third of every day — every date in the manual was a day
 * behind. The filename said 4 August on the 5th.
 *
 * That matters more here than anywhere else in the product. The dates are what make the handover
 * EVIDENCE rather than assertion: "the owner stated this on 3 August" is the line that shortens due
 * diligence, and an accountant who spots one date disagreeing with his own record stops trusting the
 * document rather than the date. A manual that raises questions is worse than no manual.
 *
 * Derived per owner rather than hardcoded to Perth, because the field is already captured and the
 * mapping is eight values — and it stays correct the day there is a Sydney client.
 *
 * THE FALLBACK IS SYDNEY, and it is a considered guess rather than a right answer: most Australians
 * are on that clock, so it is wrong for the fewest owners. What matters is that it is never UTC,
 * which is wrong for ALL of them.
 */
const STATE_TIME_ZONE: Record<AuState, string> = {
  ACT: 'Australia/Sydney',
  NSW: 'Australia/Sydney',
  NT: 'Australia/Darwin',
  QLD: 'Australia/Brisbane',
  SA: 'Australia/Adelaide',
  TAS: 'Australia/Hobart',
  VIC: 'Australia/Melbourne',
  WA: 'Australia/Perth',
};

export const DEFAULT_TIME_ZONE = 'Australia/Sydney';

export function timeZoneForState(state: string | null | undefined): string {
  const key = String(state ?? '').trim().toUpperCase();
  return STATE_TIME_ZONE[key as AuState] ?? DEFAULT_TIME_ZONE;
}

/**
 * "2026-08-05" in the owner's own clock — for filenames and stamps.
 *
 * `toISOString().slice(0, 10)` is the idiom that caused the bug; `en-CA` is the locale that formats
 * as YYYY-MM-DD, so this is the same shape read on the right day.
 */
export function isoDateIn(timeZone: string, when: Date = new Date()): string {
  return when.toLocaleDateString('en-CA', { timeZone });
}

/** "3 August 2026" in the owner's own clock — the form the handover states facts in. */
export function longDateIn(timeZone: string, value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone });
}

export interface BusinessIdentityInput {
  legalName: string;
  abn: string;
  tradingName?: string | null;
  street: string;
  locality: string;
  state: string;
  postcode: string;
  replyEmail: string;
  signOffName?: string | null;
  /** The authority checkbox. Absent or false is a refusal to save, not a default. */
  authorised: boolean;
}

/** A stored row, as the table holds it. */
export interface BusinessIdentity {
  user_id: string;
  legal_name: string;
  abn: string;
  trading_name: string | null;
  street: string;
  locality: string;
  state: string;
  postcode: string;
  country: string;
  reply_email: string;
  sign_off_name: string | null;
  authorised_at: string;
  synced_to_orchestrator_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Field name → the message shown under that field. Keyed so the form can place each one. */
export type IdentityErrors = Partial<Record<keyof BusinessIdentityInput, string>>;

export interface ValidationResult {
  ok: boolean;
  errors: IdentityErrors;
  /** Present only when ok. Normalised: trimmed, ABN digits-only, state upper-cased. */
  value?: Omit<BusinessIdentityInput, 'authorised'> & { abn: string; state: AuState };
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * 11 digits with a valid checksum, or null.
 *
 * Consumed from @caistech/abn-lookup rather than re-implemented (@caistech-first): the modulus-89
 * check is the difference between "eleven digits" and "an ABN", and a typo that passes a length
 * check goes out in the footer of real mail.
 *
 * Note the shared helper's shape — `validateAbn` returns an ERROR MESSAGE, and `null` means valid.
 * That reads backwards at a glance, so it is wrapped here once rather than at each call site.
 *
 * Digits are extracted before validating because the helper strips only whitespace: an owner who
 * types his ABN with hyphens, the way it appears on plenty of invoices, would otherwise be told his
 * own ABN is wrong.
 */
export function normaliseAbn(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  return validateAbn(digits) === null && digits.length === 11 ? digits : null;
}

export { formatAbn };

/**
 * One name off the register, split into the two the record actually needs.
 *
 * WHY THIS EXISTS. The ABR's name search (`MatchingNames.aspx`) matches ENTITY names, BUSINESS names
 * and TRADING names alike — which is what makes it usable, because an owner searches the name he says
 * out loud, not the one on the trust deed. The consequence is that the thing he picks is frequently
 * NOT the entity the ABN belongs to. Writing it straight into `legal_name` collapses the very
 * distinction the two columns exist to hold: the field bound to the ABN ends up holding a trading
 * name, the Spam Act footer identifies something that is not the entity, and the buyer's handover
 * names the wrong party — none of which looks wrong on screen, because the name is his.
 *
 * `lookupAbn` returns `entityName` alongside the ABN, so the corrected pair costs one call and the
 * owner never has to know which of his names is which. That is the point: he types the only name he
 * knows and both fields come back right.
 *
 * @param picked      what he chose off the register — an entity, business or trading name
 * @param entityName  the ABR's entity name for that ABN, or '' when the resolve failed
 *
 * DEGRADE, DON'T FAKE: an empty `entityName` means we learned nothing, so his choice stands
 * unaltered. A failed lookup must never silently downgrade a name he already picked correctly.
 */
export function splitRegisteredName(
  picked: string,
  entityName: string,
): { legalName: string; tradingName: string | null } {
  const chosen = (picked || '').trim();
  const entity = (entityName || '').trim();
  if (!entity) return { legalName: chosen, tradingName: null };

  // Compared loosely because the register and the owner disagree about case and spacing constantly,
  // and "FACTORY2KEY  PTY LTD" is not a different business from "Factory2Key Pty Ltd". A false
  // difference here would invent a trading name that is really just the entity typed shoutily.
  const same = normaliseName(chosen) === normaliseName(entity);
  // The register's spelling wins even when they match, so the footer carries the entity exactly as
  // the ABR holds it — which is what anyone checking it will compare against.
  return same ? { legalName: entity, tradingName: null } : { legalName: entity, tradingName: chosen };
}

function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * The address as it appears in the footer, on one line.
 *
 * Composed here rather than stored composed, so the parts stay individually correctable. Country is
 * included because the footer is read by people who do not know where the sender is.
 */
export function composePostalAddress(parts: {
  street: string;
  locality: string;
  state: string;
  postcode: string;
  country?: string | null;
}): string {
  return [
    parts.street.trim(),
    `${parts.locality.trim()} ${parts.state.trim().toUpperCase()} ${parts.postcode.trim()}`.trim(),
    (parts.country || 'Australia').trim(),
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Everything the sender needs, present and well-formed.
 *
 * Deliberately all-or-nothing. The orchestrator's connector checks three columns and refuses the
 * whole tenant if any is missing, so a partial save produces a row that LOOKS configured and still
 * cannot send — which is the exact state this feature exists to end.
 */
export function validateBusinessIdentity(input: BusinessIdentityInput): ValidationResult {
  const errors: IdentityErrors = {};

  const legalName = (input.legalName || '').trim();
  if (!legalName) errors.legalName = 'Enter the registered business name.';
  else if (legalName.length > 200) errors.legalName = 'That is longer than a registered name can be.';

  const abn = normaliseAbn(input.abn || '');
  if (!abn) {
    errors.abn = (input.abn || '').trim()
      ? "That ABN doesn't check out. It should be 11 digits — search your business name above to fill it in."
      : 'Enter your ABN, or search your business name above to fill it in.';
  }

  const street = (input.street || '').trim();
  if (!street) errors.street = 'Enter the street address.';

  const locality = (input.locality || '').trim();
  if (!locality) errors.locality = 'Enter the suburb or town.';

  const state = (input.state || '').trim().toUpperCase();
  if (!state) errors.state = 'Choose a state.';
  else if (!(AU_STATES as readonly string[]).includes(state)) errors.state = 'Choose an Australian state or territory.';

  const postcode = (input.postcode || '').trim();
  if (!/^\d{4}$/.test(postcode)) errors.postcode = 'Enter a 4-digit postcode.';

  const replyEmail = (input.replyEmail || '').trim();
  if (!replyEmail) errors.replyEmail = 'Enter the address replies should go to.';
  else if (!EMAIL.test(replyEmail)) errors.replyEmail = "That doesn't look like an email address.";

  // Not a formality. Mail goes out under his ABN; he has to have said so.
  if (!input.authorised) errors.authorised = 'Please confirm you authorise Kira to send email as this business.';

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    errors: {},
    value: {
      legalName,
      abn: abn as string,
      tradingName: (input.tradingName || '').trim() || null,
      street,
      locality,
      state: state as AuState,
      postcode,
      replyEmail,
      signOffName: (input.signOffName || '').trim() || null,
    },
  };
}

/**
 * Is this account able to send?
 *
 * Mirrors the orchestrator connector's own check (legal_name + abn + postal_address) rather than
 * "does a row exist", because those are not the same question and answering the easier one is how a
 * screen ends up reassuring somebody about a send that will be refused.
 */
export function canSend(identity: BusinessIdentity | null | undefined): boolean {
  if (!identity) return false;
  return Boolean(
    identity.legal_name?.trim() &&
      /^\d{11}$/.test(identity.abn || '') &&
      identity.street?.trim() &&
      identity.locality?.trim() &&
      identity.state?.trim() &&
      identity.postcode?.trim(),
  );
}

/** The name the world sees: the trading name when there is one, else the entity. */
export function displayName(identity: BusinessIdentity): string {
  return identity.trading_name?.trim() || identity.legal_name;
}
