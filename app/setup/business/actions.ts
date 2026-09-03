'use server';

// Saving the business identity, and pushing it to the system that sends.
//
// Two writes, in a deliberate order: Kira's own row first, then the orchestrator. If the push fails
// the identity is still saved — losing what the owner just typed because someone else's service was
// down would be its own small insult — but the row is left UNSYNCED and every surface says so. The
// state "Kira knows who you are, the sender does not" is real, and pretending otherwise is the
// failure this whole feature exists to end.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { validateAbn } from '@caistech/abn-lookup';

import { getCurrentAppUser } from '@/lib/auth';
import { validateBusinessIdentity, type IdentityErrors } from '@/lib/business-identity';
import { getBusinessIdentity, upsertBusinessIdentity, markSynced, clearSynced } from '@/lib/business-identity/store';
import { pushIdentityToOrchestrator } from '@/lib/business-identity/sync';

export interface IdentityFormState {
  errors?: IdentityErrors;
  /** A problem with the save itself, rather than with a field. */
  message?: string;
}

export async function saveBusinessIdentity(
  _prev: IdentityFormState | null,
  formData: FormData,
): Promise<IdentityFormState> {
  const user = await getCurrentAppUser();
  if (!user?.id) return { message: 'You are not signed in.' };

  const s = (key: string) => String(formData.get(key) || '');

  // Two possible sources for the ABN, and the verified one wins.
  //
  // `abn_lookup` is the hidden field AbnLookupField fills when the owner PICKS his business off the
  // register, so it came from the ABR rather than memory. `abn` is the visible input he can type
  // into when the register is down, unconfigured, or simply hasn't got him. Preferring the lookup is
  // safe because that component clears its own selection the moment the name is edited — so a stale
  // selection cannot outrank something typed afterwards.
  const result = validateBusinessIdentity({
    legalName: s('legal_name'),
    abn: s('abn_lookup') || s('abn'),
    tradingName: s('trading_name'),
    street: s('street'),
    locality: s('locality'),
    state: s('state'),
    postcode: s('postcode'),
    replyEmail: s('reply_email'),
    signOffName: s('sign_off_name'),
    sendingDomain: s('sending_domain'),
    authorised: formData.get('authorised') === 'on',
  });

  if (!result.ok || !result.value) return { errors: result.errors };

  const v = result.value;

  // `authorised` is intentionally stripped from result.value (ValidationResult.value is
  // Omit<BusinessIdentityInput, 'authorised'>), so it is NOT reachable via `v`. Read it from
  // the form directly — the checkbox is exactly what gates the consent stamp in upsert.
  const authorised = formData.get('authorised') === 'on';

  // THE ABN IS CHECKED, NOT JUST COLLECTED.
  //
  // A tester's account was sitting on 99 999 999 999 — eleven digits, right shape, not a real ABN —
  // and nothing stopped it. That number then travels: it prints on the handover document he hands an
  // advisor, and it is the identification half of the Spam Act footer on every email Kira sends for
  // him. An invalid ABN in a compliance footer is worse than a missing one, because it looks
  // discharged.
  //
  // `validateAbn` is the ABR's own weighted-modulus check from @caistech/abn-lookup — arithmetic, no
  // network, so it cannot fail open on an outage. It catches a typo and a made-up number; it does
  // not prove the business exists, which is what the ABR lookup beside the field is for.
  // ⚠️ validateAbn RETURNS AN ERROR MESSAGE, OR null WHEN VALID. It is not a predicate, and reading
  // it as one inverts the check completely:
  //
  //     validateAbn('54672395685')  -> null                     (valid)
  //     validateAbn('99999999999')  -> 'Invalid ABN checksum'    (invalid)
  //
  // so `!validateAbn(abn)` was TRUE for every correct ABN. It REJECTED 100% of real businesses, and
  // nobody could complete setup at all.
  //
  // It was not also a hole, and it is worth being precise about that: normaliseAbn already does
  // `validateAbn(digits) === null`, the correct reading, so a bad checksum is null before this line
  // runs and validateBusinessIdentity has already refused it. This gate never saw a bad ABN. It was
  // pure harm — it only ever refused good ones, which is why it survived: an owner told his own ABN
  // is wrong concludes the FORM is broken, and reports it as that, if at all.
  //
  // Kept as a backstop rather than deleted, because it is now correct and it is the line that would
  // catch normaliseAbn's contract changing underneath it.
  const abnError = v.abn ? validateAbn(v.abn) : null;
  if (abnError) {
    return {
      errors: {
        // The package says WHICH way it is wrong; passing that through beats a generic line.
        abn: `${abnError}. It goes on your handover document and on the bottom of every email Kira sends for you.`,
      },
    };
  }

  // Preserve the sending domain verification across edits. The form collects the domain
  // but the verified_at timestamp is set by Resend — losing it on an unrelated identity
  // edit would force the owner through the DNS dance again.
  let sendingDomain = v.sendingDomain ?? null;
  let sendingDomainVerifiedAt: string | null = null;
  try {
    const existing = await getBusinessIdentity(user.id);
    if (existing?.sending_domain === sendingDomain && existing?.sending_domain_verified_at) {
      sendingDomainVerifiedAt = existing.sending_domain_verified_at;
    }
  } catch {
    // Non-fatal: we may lose the verified domain, but the save itself must not fail.
  }

  let saved;
  try {
    saved = await upsertBusinessIdentity(user.id, {
      legal_name: v.legalName,
      abn: v.abn,
      trading_name: v.tradingName ?? null,
      street: v.street,
      locality: v.locality,
      state: v.state,
      postcode: v.postcode,
      country: 'AU',
      reply_email: v.replyEmail,
      sign_off_name: v.signOffName ?? null,
      sending_domain: sendingDomain,
      // NEVER set here. It is set only when Resend reports the domain verified, because an
      // unverified domain is rejected at send time — the precondition orchestrator/src/contract.ts
      // states and that was broken by hand on updates.factory2key.com.au, where DNS was published,
      // the domain was never added to Resend, from_email was set anyway, and every send 403'd after
      // the agent had already told the owner it was sent.
      sending_domain_verified_at: sendingDomainVerifiedAt,
      authorised,
    });
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'Could not save your business details.' };
  }

  const sync = await pushIdentityToOrchestrator(user.id, {
    legal_name: saved.legal_name,
    abn: saved.abn,
    trading_name: saved.trading_name,
    street: saved.street,
    locality: saved.locality,
    state: saved.state,
    postcode: saved.postcode,
    country: saved.country,
    reply_email: saved.reply_email,
    sign_off_name: saved.sign_off_name,
    sending_domain: saved.sending_domain,
    sending_domain_verified_at: saved.sending_domain_verified_at,
    authorised_at: saved.authorised_at,
  });

  // Stamped only on a confirmed acceptance; cleared on failure, because after an EDIT the sender is
  // holding the previous entity and calling that "synced" would be true of the wrong business.
  if (sync.ok) await markSynced(user.id);
  else await clearSynced(user.id);

  revalidatePath('/dashboard');
  revalidatePath('/settings');
  revalidatePath('/setup/business');

  // Redirect outside the try blocks: redirect() signals by throwing, and catching it here would turn
  // a successful save into an error message.
  redirect(sync.ok ? '/dashboard?identity=saved' : '/dashboard?identity=unsynced');
}

/**
 * Retry the push on its own, without re-typing anything.
 *
 * Exists because the common failure is transient and on our side — the orchestrator restarting, a
 * secret mid-rotation — and asking the owner to re-enter his ABN to work around our outage would be
 * absurd.
 */
export async function retryIdentitySync(): Promise<void> {
  const user = await getCurrentAppUser();
  if (!user?.id) return;

  const identity = await getBusinessIdentity(user.id);
  if (!identity) return;

  const sync = await pushIdentityToOrchestrator(user.id, identity);
  if (sync.ok) await markSynced(user.id);

  revalidatePath('/dashboard');
  revalidatePath('/settings');
}
