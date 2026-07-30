// The first thing an owner does after paying: tell Kira who she is writing as.
//
// Placed BEFORE the dashboard rather than as a card on it, on purpose. The alternative — let him
// straight in and block at his first send — reads as gentler and is worse: his first ever request of
// Kira would be the one that fails, which is precisely the state four tasks are sitting in right
// now. Discovering the requirement at the moment you asked for a quote is the bad version.
//
// It is also short. One search fills the entity and the ABN, so there are three things to type.

import { redirect } from 'next/navigation';

import { getAuthUser, getCurrentAppUser } from '@/lib/auth';
import { canSend } from '@/lib/business-identity';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { BusinessIdentityForm } from '@/components/BusinessIdentityForm';

export const metadata = { title: 'Your business · Kira' };
export const dynamic = 'force-dynamic';

export default async function BusinessSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const sp = await searchParams;
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');

  const user = await getCurrentAppUser();
  if (!user?.id) redirect('/login');

  const identity = await getBusinessIdentity(user.id);
  const editing = sp?.edit === '1';

  // Already done and not deliberately editing — don't make a configured owner walk through it again.
  if (canSend(identity) && !editing) redirect('/dashboard');

  const signOff =
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.name || '';

  return (
    <div className="min-h-screen bg-amber-50 px-5 py-12">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            {editing ? 'Your business details' : 'First — who is Kira writing as?'}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-stone-700">
            {editing
              ? 'These details appear at the bottom of every email Kira sends for you, and tell customers who to reply to.'
              : 'Before Kira can send anything for you — a quote, a follow-up, chasing an invoice — she needs to know whose name goes at the bottom of it. This takes about a minute, and you only do it once.'}
          </p>
        </header>

        <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm sm:p-8">
          <BusinessIdentityForm
            identity={identity}
            defaultReplyEmail={authUser.email ?? ''}
            defaultSignOffName={signOff}
            submitLabel={editing ? 'Save changes' : 'Save and continue'}
          />
        </div>
      </div>
    </div>
  );
}
