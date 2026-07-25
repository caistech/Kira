// app/introducer/page.tsx
//
// The introducer's board: the owners they introduced, where each one is, and whether the valuation
// is moving. Status and movement only — never content. That boundary is enforced server-side by
// introducer_owner_projection(), not by what this page chooses to render.
//
// The retention hook is the movement column: an introducer who can see their owner's number
// climbing has a reason to come back, and a reason to send the next one.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  INTRODUCER_SESSION_COOKIE,
  getIntroducerFromSession,
  hasAcceptedUndertaking,
  ownerProjection,
  type OwnerProjection,
} from '@/lib/introducer';

export const metadata = { title: 'Your introductions · Kira' };
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<OwnerProjection['status'], { text: string; tone: string }> = {
  clicked: { text: 'Looking', tone: 'bg-gray-100 text-gray-700' },
  signed_up: { text: 'Signed up', tone: 'bg-blue-50 text-blue-700' },
  trialing: { text: 'Free month', tone: 'bg-amber-50 text-amber-700' },
  paying: { text: 'Paying', tone: 'bg-teal-50 text-teal-700' },
  lapsed: { text: 'Lapsed', tone: 'bg-red-50 text-red-700' },
};

function money(amount: number | null): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
    notation: amount >= 1_000_000 ? 'compact' : 'standard',
  }).format(amount);
}

function when(iso: string | null): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );
}

export default async function IntroducerBoardPage() {
  const token = (await cookies()).get(INTRODUCER_SESSION_COOKIE)?.value;
  const introducer = await getIntroducerFromSession(token);
  if (!introducer) redirect('/introducer/expired');

  // No board until the undertaking is accepted — the channel's consent position rests on its first
  // clause, so seeing owner data before agreeing to it would be the wrong way round.
  if (!hasAcceptedUndertaking(introducer)) redirect('/introducer/terms');

  const owners = await ownerProjection(introducer.id);
  const paying = owners.filter((o) => o.status === 'paying').length;
  const trialing = owners.filter((o) => o.status === 'trialing').length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your introductions</h1>
        <p className="mt-2 max-w-prose text-base text-gray-600">
          Everyone you&apos;ve introduced to Kira, where they&apos;ve got to, and how their business
          valuation is moving. You can see progress, never their conversations — what an owner tells
          Kira stays between them.
        </p>
        {introducer.org_name && (
          <p className="mt-2 text-sm text-gray-500">
            {introducer.name ?? introducer.email} · {introducer.org_name}
          </p>
        )}
      </header>

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Introduced</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{owners.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">In their free month</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{trialing}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Paying</p>
          <p className="mt-1 text-3xl font-bold text-teal-700">{paying}</p>
        </div>
      </section>

      {owners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-base font-medium text-gray-900">No introductions yet</p>
          <p className="mx-auto mt-2 max-w-prose text-sm text-gray-600">
            Send an owner your link and they&apos;ll appear here the moment they open it — before
            they sign up, so you can see what&apos;s landing.
          </p>
          <p className="mt-4 break-all rounded-lg bg-gray-50 px-4 py-3 font-mono text-sm text-gray-700">
            {process.env.NEXT_PUBLIC_APP_URL}/r/{introducer.referral_token}
          </p>
        </div>
      ) : (
        <>
          {/* Table on laptop; the same rows as stacked cards on mobile (PRODUCT_STANDARDS §1). */}
          <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 text-sm text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Value gap</th>
                  <th className="px-5 py-3 font-medium">Readiness</th>
                  <th className="px-5 py-3 font-medium">Introduced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {owners.map((owner) => (
                  <tr key={owner.introductionId}>
                    <td className="px-5 py-4 text-base font-medium text-gray-900">{owner.ownerLabel}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-sm font-medium ${STATUS_LABEL[owner.status].tone}`}
                      >
                        {STATUS_LABEL[owner.status].text}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-base text-gray-700">{money(owner.valuationGap)}</td>
                    <td className="px-5 py-4 text-base text-gray-700">
                      {owner.readiness == null ? '—' : `${Math.round(owner.readiness)}%`}
                    </td>
                    <td className="px-5 py-4 text-base text-gray-500">{when(owner.firstTouchAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {owners.map((owner) => (
              <div key={owner.introductionId} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-medium text-gray-900">{owner.ownerLabel}</p>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-sm font-medium ${STATUS_LABEL[owner.status].tone}`}
                  >
                    {STATUS_LABEL[owner.status].text}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Value gap</dt>
                    <dd className="text-base text-gray-900">{money(owner.valuationGap)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Readiness</dt>
                    <dd className="text-base text-gray-900">
                      {owner.readiness == null ? '—' : `${Math.round(owner.readiness)}%`}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-gray-500">Introduced {when(owner.firstTouchAt)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-medium text-gray-900">Your link</p>
            <p className="mt-2 break-all rounded-lg bg-gray-50 px-4 py-3 font-mono text-sm text-gray-700">
              {process.env.NEXT_PUBLIC_APP_URL}/r/{introducer.referral_token}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
