// lib/introducer/disclosure.ts
//
// The referral-fee disclosure an introducer gives their client — supplied by us, not drafted by
// them.
//
// WHY WE WRITE IT AND NOT THEM. An accountant or broker who takes a referral fee has a disclosure
// obligation under APES 110 s330 (written; states the fee, who pays it, and how it is calculated)
// and, if they are a registered tax agent, under the TPB's conflicts-of-interest Code item
// (states the AMOUNT, given before or when the service is provided, with time for the client to
// consider it). Every fact those obligations require is OURS — our name, our rate, our price bands.
// Leaving them to draft it means each one writes a different, weaker version, and the friction of
// having to write anything at all is a real reason to not bother referring.
//
// TIMING. The obligation bites at INTRODUCTION, not at conversion. The commission is earned when
// the owner subscribes, but the conflict exists the moment the introducer suggests us — so this
// text travels with the referral link, which is why it renders beside the link on the board rather
// than in a settings page nobody opens.
//
// THE AMOUNT PROBLEM. "10% of the subscription" is a basis, not an amount, and the band is not
// known until the owner has run their valuation. The disclosure therefore states the basis AND the
// range it can fall in, derived from PRICE_TIERS so the two cannot drift apart.
//
// Position + sources: orchestrator/REFERRAL_FEE_POSITION.md. NOT legal advice — that document is
// desk research pending the lawyer review carried in BROKER_CHANNEL_BUILD_STATE guardrails.

import { PRICE_TIERS } from '@/lib/valuation/pricing';

/** Commission paid to an introducer, as a percentage of what the owner pays. */
export const COMMISSION_RATE_PCT = 10;

function money(amount: number): string {
  // Cents matter here: "10% of $499" is $49.90, and rounding it to $50 in a disclosure would
  // misstate the figure the obligation asks them to state.
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/** The monthly commission range across the current price bands, e.g. "$49.90 to $499.90". */
export function commissionRange(): { low: string; high: string; text: string } {
  const monthlies = PRICE_TIERS.map((t) => t.monthly);
  const low = money((Math.min(...monthlies) * COMMISSION_RATE_PCT) / 100);
  const high = money((Math.max(...monthlies) * COMMISSION_RATE_PCT) / 100);
  return { low, high, text: `${low} to ${high}` };
}

export interface DisclosureParams {
  /** The introducer's own name, as their client knows them. */
  introducerName: string | null;
  /** Their firm, where they gave one. */
  orgName: string | null;
}

/**
 * The disclosure statement, ready to paste into their own email to the owner.
 *
 * Written in the introducer's first person, because they are the one making the statement — a
 * disclosure phrased in our voice is not their disclosure.
 */
export function disclosureText({ introducerName, orgName }: DisclosureParams): string {
  const who = orgName ? `${introducerName ?? 'I'} of ${orgName}` : introducerName ?? 'I';
  const { text: range } = commissionRange();

  return [
    `Disclosure: I have a commercial interest in this introduction.`,
    ``,
    `If you subscribe to Kira, Corporate AI Solutions pays ${who === 'I' ? 'me' : who} a commission of ` +
      `${COMMISSION_RATE_PCT}% of what you pay them, each month, for as long as you remain a subscriber. ` +
      `Kira's monthly price is set by the size of the value gap your valuation identifies, so the ` +
      `commission is currently between ${range} per month. There is no free month commission — ` +
      `nothing is paid unless and until you are a paying subscriber.`,
    ``,
    `This does not change what you pay. You are under no obligation to take this up, and I am happy ` +
      `to talk through it before you decide.`,
  ].join('\n');
}

/**
 * The one case where the fee cannot be paid at all.
 *
 * APES 110 treats a commission connected with an ASSURANCE engagement as a threat to independence
 * that no safeguard can reduce to an acceptable level — so where the introducer audits or reviews
 * that client, disclosure does not cure it and the commission must be switched off. This is the
 * reason the firm-level opt-out exists as a control rather than a courtesy.
 */
export const ASSURANCE_CARVE_OUT =
  'If you provide audit or review (assurance) services to an owner, we cannot pay you a commission ' +
  'for introducing them — no disclosure makes that acceptable under APES 110. Tell us and we will ' +
  'switch the fee off for that introduction, or for your account entirely. The introduction still ' +
  'works and your dashboard is unchanged; you simply are not paid for it.';
