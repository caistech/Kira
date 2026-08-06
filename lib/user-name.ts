// lib/user-name.ts
//
// Is this a name, or is it the front half of an email address?
//
// THE DEFECT. `supabase/migrations/20260720500000_auth_link_confirm_gate.sql` sets a new user's
// first name to `COALESCE(meta->>'first_name', meta->>'name', split_part(NEW.email, '@', 1))`. That
// last fallback INVENTS a name: sign up as `ray.thompson@bigpond.com` with no metadata and the
// product decides you are called "ray.thompson".
//
// It is one bad value surfacing in three places, all of them found by the same walkthrough
// (Ray, 6 August 2026):
//
//   * "How Kira signs off" pre-filled with `dennis+ray` — the string that would go at the bottom of
//     a quote to his customer. *"A man in a hurry ticks the box and hits Save, and Kira signs off to
//     his client as ray.thompson."*
//   * The valuation page greeting him "You are signed in, dennis+ray" and then, four inches lower,
//     asking "What should we call you?" — it does not know his name and is using it anyway.
//   * The Genome export attributing entries to "Recorded by dennis+qauser".
//
// WHY A PREDICATE RATHER THAN A DATA FIX. The trigger is corrected for NEW signups in
// `20260806...` — but every existing row already carries the invented name, and rewriting real
// users' name fields in place is data surgery on the one field they would notice. This asks the
// cheaper question at read time instead: does the stored name look like it came out of the address?
// If it does, we do not have a name, and the honest move is to ask for one rather than print it.
//
// DELIBERATELY CONSERVATIVE. A real person can genuinely be called Dennis and use `dennis@…`, and
// suppressing HIS name to satisfy a heuristic is the worse error — he sees the product forget who he
// is. So this only rejects a name when it matches the local part AND the local part carries a
// machine signature: a plus-tag, a dot-separated pair, a digit, or an underscore. Bare `dennis`
// against `dennis@…` is ACCEPTED, because that is overwhelmingly a real first name.

/** The local part of an email address, lowercased. `''` when there isn't one. */
function localPart(email: string | null | undefined): string {
  if (!email) return '';
  const at = email.indexOf('@');
  return (at === -1 ? email : email.slice(0, at)).trim().toLowerCase();
}

/**
 * Does this string look machine-made rather than typed by a person introducing themselves?
 *
 * `dennis+ray`, `ray.thompson`, `dennis_mcm`, `ray2` — all shapes an address takes and a first name
 * does not. Note `ray.thompson` is a person's NAME, but it is not a FIRST name, and it is not what he
 * would write in a box labelled "how Kira signs off".
 */
function looksMachineMade(value: string): boolean {
  return /[+_\d]/.test(value) || value.includes('.');
}

/**
 * The user's first name, or `null` when what we hold is really their email address.
 *
 * Callers must handle `null` by ASKING, not by substituting something else — the whole failure being
 * fixed is a surface printing a placeholder as though it were a fact about him.
 */
export function realFirstName(
  user: { first_name?: string | null; name?: string | null } | null | undefined,
  email: string | null | undefined,
): string | null {
  const candidate = (user?.first_name || user?.name || '').trim();
  if (!candidate) return null;

  const local = localPart(email);
  if (local && candidate.toLowerCase() === local && looksMachineMade(local)) return null;

  return candidate;
}

/**
 * The full name to sign off as, or `null`.
 *
 * Same rule applied to the joined first + last, because the sign-off field is the one that reaches a
 * customer. An empty field with a good placeholder beats a wrong name filled in for him: he skims a
 * pre-filled box and accepts it, and he reads an empty one.
 */
export function realSignOffName(
  user: { first_name?: string | null; last_name?: string | null; name?: string | null } | null | undefined,
  email: string | null | undefined,
): string | null {
  const joined = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const candidate = joined || (user?.name || '').trim();
  if (!candidate) return null;

  const local = localPart(email);
  if (local && candidate.toLowerCase() === local && looksMachineMade(local)) return null;

  return candidate;
}
