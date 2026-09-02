// @no-voice-route: operator console — Kira is the OWNER-facing product, and these are the
// screens the operator uses to look at owners. A "talk to Kira" control here would offer the
// operator a conversation with a tenant agent that is not his, on a page about other people's
// businesses. §6 is a promise to the owner about his own product, not to every signed-in user.
// (/admin/exec is the deliberate exception and keeps its voice surface: it is the operator
// looking at ONE owner, where hearing what she says is the point of the screen.)
// app/admin/(panel)/introducers/page.tsx
//
// The operator's view of the introducer channel: who's in it, what they've sent, and who's
// actually converting. This is the surface that turns `issueMagicLink()` into something a person
// can use — before it existed, an introducer could only be created by hand in SQL.
//
// Counts come from introductions, so "sent" means someone genuinely opened their link — not how
// many emails they claim to have written.

import { createServiceClientV2 } from '@/lib/supabase/server';

import { AddIntroducerForm } from './AddIntroducerForm';
import { IntroducerActions } from './IntroducerActions';

export const metadata = { title: 'Introducers · Kira Admin' };
export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

type IntroducerRow = {
  id: string;
  email: string;
  name: string | null;
  org_name: string | null;
  role: string;
  status: string;
  referral_token: string;
  created_at: string;
};

const STATUS_CLASS: Record<string, string> = {
  invited: 'bg-amber-100 text-amber-700',
  active: 'bg-violet-100 text-violet-700',
  suspended: 'bg-red-100 text-red-700',
};

export default async function AdminIntroducersPage() {
  const svc = createServiceClientV2();

  const [{ data: introducerData }, { data: introductionData }] = await Promise.all([
    svc
      .from('introducers')
      .select('id, email, name, org_name, role, status, referral_token, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    svc.from('introductions').select('introducer_id, status'),
  ]);

  const introducers = (introducerData ?? []) as IntroducerRow[];
  const introductions = (introductionData ?? []) as { introducer_id: string; status: string }[];

  const countsFor = (id: string) => {
    const mine = introductions.filter((i) => i.introducer_id === id);
    return {
      total: mine.length,
      paying: mine.filter((i) => i.status === 'paying').length,
    };
  };

  const totalPaying = introductions.filter((i) => i.status === 'paying').length;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Introducers</h1>
        <p className="mt-1 max-w-prose text-base text-gray-600">
          Brokers, accountants and advisors who introduce owners to Kira. Adding someone here emails
          them their referral link and a sign-in link for their own dashboard. They can see their
          owners&apos; progress — never their conversations.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Introducers</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{introducers.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Introductions</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{introductions.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Paying</p>
          <p className="mt-1 text-3xl font-bold text-violet-700">{totalPaying}</p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Add an introducer</h2>
        <p className="mt-1 text-sm text-gray-500">
          Commission is 10% of what the owner pays, monthly, for as long as they keep paying.
        </p>
        <div className="mt-4">
          <AddIntroducerForm />
        </div>
      </section>

      {introducers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-base font-medium text-gray-900">No introducers yet</p>
          <p className="mx-auto mt-2 max-w-prose text-sm text-gray-600">
            Add the first broker above. Prove one brokerage will send ten owners before building
            anything more elaborate around them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {introducers.map((introducer) => {
            const counts = countsFor(introducer.id);
            return (
              <div key={introducer.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      {introducer.name || introducer.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {introducer.name ? `${introducer.email} · ` : ''}
                      {introducer.org_name || 'No firm recorded'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-sm font-medium ${
                      STATUS_CLASS[introducer.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {introducer.status}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <dt className="text-sm text-gray-500">Introductions</dt>
                    <dd className="text-xl font-semibold text-gray-900">{counts.total}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Paying</dt>
                    <dd className="text-xl font-semibold text-violet-700">{counts.paying}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500">Their link</dt>
                    <dd className="mt-1 break-all font-mono text-sm text-gray-700">
                      {APP_URL}/r/{introducer.referral_token}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <IntroducerActions
                    introducerId={introducer.id}
                    suspended={introducer.status === 'suspended'}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
