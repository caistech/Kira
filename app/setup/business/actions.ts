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
    authorised: formData.get('authorised') === 'on',
  });

  if (!result.ok || !result.value) return { errors: result.errors };

  const v = result.value;

  // Preserve the original authorisation moment across edits. Re-stamping it on every save would mean
  // the record says he authorised this on the day he corrected a postcode, which is not what happened.
  let authorisedAt = new Date().toISOString();
  try {
    const existing = await getBusinessIdentity(user.id);
    if (existing?.authorised_at) authorisedAt = existing.authorised_at;
  } catch {
    // A read failure must not block the save; the worst case is a fresh timestamp on an edit.
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
      reply_email: v.replyEmail,
      sign_off_name: v.signOffName ?? null,
      authorised_at: authorisedAt,
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
