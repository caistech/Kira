// lib/genome/signature-name.ts — is this a name a man would sign an email with?
//
// ⚠️ THE FINDING. Ray opened the Share panel and found the covering note to his broker signed
// **"dennis+ray"** — the front half of the account's email address, stored in `users.first_name` at
// signup and printed as though it were his name.
//
//   "It signs off 'dennis+ray' — the front half of my email address, as if that were my name."
//
// A wrong name on the one artefact that reaches another human being is not a cosmetic defect: it is
// the first thing a broker reads, and it says the sender does not know who he is dealing with.
//
// ⚠️ THE RULE IS REJECT, NOT REPAIR. The tempting version cleans the string up — split on `+`, strip
// digits, capitalise — and it is wrong, because a repaired guess is indistinguishable from a real
// name and gets signed anyway. "dennis+ray" would become "Dennis", which is not who is sending it.
// An omitted signature is honest and the man can type his own; an invented one cannot be noticed.

/** Characters that never appear in a name and always appear in an email local-part or a handle. */
const NOT_IN_A_NAME = /[+@_\d]/;

/**
 * The name to sign with, or null when we do not actually know it.
 *
 * Deliberately conservative in one direction only: a genuine name that is rejected costs an
 * unsigned draft the owner completes himself, and a handle that is accepted goes out under his name
 * to the person he most wants to impress.
 */
export function signatureName(raw: string | null | undefined): string | null {
  const name = String(raw ?? '').trim();
  if (!name) return null;
  // A local-part marker anywhere in the string disqualifies it outright.
  if (NOT_IN_A_NAME.test(name)) return null;
  // Anything with a dot inside it is `first.last` far more often than it is a real given name.
  if (/\w\.\w/.test(name)) return null;
  // Single characters and very long strings are both signs of something other than a name.
  if (name.length < 2 || name.length > 60) return null;
  // Must contain letters. "..." and "---" pass every test above.
  if (!/\p{L}/u.test(name)) return null;
  return name;
}
