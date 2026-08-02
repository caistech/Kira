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
import { COMMISSION_RATE_PCT, commissionRange, disclosureText } from '@/lib/introducer/disclosure';

export const metadata = { title: 'Your introductions · Kira' };
export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<OwnerProjection['status'], { text: string; tone: string }> = {
  clicked: { text: 'Looking', tone: 'bg-gray-100 text-gray-700' },
  signed_up: { text: 'Signed up', tone: 'bg-blue-50 text-blue-700' },
  // Legacy: Kira bills in arrears and issues no trials, so no NEW introduction reaches this state.
  // Rows written before the billing model changed still carry it, so it keeps a truthful label.
  trialing: { text: 'First month', tone: 'bg-amber-50 text-amber-700' },
  paying: { text: 'Paying', tone: 'bg-violet-50 text-violet-700' },
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

/**
 * Readiness as movement, not a bare figure.
 *
 * The board has always promised "valuation movement" and, until the snapshots table, could only
 * join one overwritten row — so it showed a number with no origin. This renders the difference
 * where there is one, says so plainly where there isn't, and never dresses a single data point up
 * as a trend.
 */
function Movement({ owner }: { owner: OwnerProjection }) {
  if (owner.readiness == null) return <span className="text-gray-400">—</span>;

  const now = Math.round(owner.readiness);
  const ceiling = owner.readinessPotential == null ? null : Math.round(owner.readinessPotential);

  // One point on the curve is a starting position, not a climb. Saying "no change yet" is honest
  // and reads as the system working; an arrow that never moves reads as broken.
  if (owner.baselineReadiness == null || owner.snapshotCount < 2) {
    return (
      <span className="text-gray-700">
        {now}%{ceiling != null && <span className="text-gray-400"> of {ceiling}%</span>}
        <span className="block text-sm text-gray-500">starting position</span>
      </span>
    );
  }

  const from = Math.round(owner.baselineReadiness);
  const delta = now - from;
  const tone = delta > 0 ? 'text-violet-700' : delta < 0 ? 'text-amber-700' : 'text-gray-500';

  return (
    <span className="text-gray-700">
      {from}% → {now}%{ceiling != null && <span className="text-gray-400"> of {ceiling}%</span>}
      <span className={`block text-sm ${tone}`}>
        {delta > 0 ? `+${delta} points` : delta < 0 ? `${delta} points` : 'no change yet'}
      </span>
    </span>
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
  // Everyone who has an account but is not yet being billed. The tile used to count "free month",
  // which under arrears is a state that never occurs — it would have read zero forever.
  const signedUp = owners.filter((o) => o.status === 'signed_up' || o.status === 'trialing').length;

  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${introducer.referral_token}`;
  // The disclosure sits WITH the link, in both states, because the obligation attaches at the
  // introduction — not at conversion, and not in a settings page nobody opens.
  const disclosure = disclosureText({
    introducerName: introducer.name,
    orgName: introducer.org_name,
  });

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
          <p className="text-sm text-gray-500">Signed up, not yet billed</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{signedUp}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Paying</p>
          <p className="mt-1 text-3xl font-bold text-violet-700">{paying}</p>
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
            {referralUrl}
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
                  <th className="px-5 py-3 font-medium">Readiness movement</th>
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
                    <td className="px-5 py-4 text-base">
                      <Movement owner={owner} />
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
                    <dt className="text-gray-500">Readiness movement</dt>
                    <dd className="text-base text-gray-900">
                      <Movement owner={owner} />
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
              {referralUrl}
            </p>
          </div>
        </>
      )}

      {/* Send this WITH the link. The introducer's disclosure obligation attaches at the
          introduction, so the wording lives next to the thing they are about to send. */}
      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-medium text-gray-900">Send this with your link</h2>
        <p className="mt-2 max-w-prose text-sm text-gray-600">
          You&apos;re paid {COMMISSION_RATE_PCT}% of what an owner pays, every month, for as long as
          they stay — currently {commissionRange().text} a month depending on their price band.
          Telling them that in writing is your obligation, so here is the wording. Paste it into your
          own message, at the time you introduce us rather than afterwards.
        </p>
        <pre className="mt-3 max-w-prose whitespace-pre-wrap rounded-lg bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-800">
          {disclosure}
        </pre>
        <p className="mt-3 max-w-prose text-sm text-gray-500">
          If you audit or review this owner, we can&apos;t pay you for the introduction — tell us and
          we&apos;ll switch the fee off. The introduction still works.
        </p>
      </section>
    </div>
  );
}
