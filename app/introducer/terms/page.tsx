// app/introducer/terms/page.tsx
//
// The door. An introducer sees this once, before the board, and cannot get past it without
// accepting — because the channel's whole consent position rests on the first clause, and an
// unrecorded rule is a hope rather than a control.
//
// Written plainly and in the second person. A broker skimming this between meetings should be able
// to tell exactly what they're agreeing to, which is also what makes the acceptance meaningful.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  INTRODUCER_SESSION_COOKIE,
  getIntroducerFromSession,
  hasAcceptedUndertaking,
} from '@/lib/introducer';
import { UNDERTAKING_CLAUSES, UNDERTAKING_VERSION } from '@/lib/introducer/undertaking';

import { AcceptUndertakingForm } from './AcceptUndertakingForm';

export const metadata = { title: 'Before you start · Kira' };
export const dynamic = 'force-dynamic';

export default async function IntroducerTermsPage() {
  const token = (await cookies()).get(INTRODUCER_SESSION_COOKIE)?.value;
  const introducer = await getIntroducerFromSession(token);
  if (!introducer) redirect('/introducer/expired');

  // Already accepted the current wording — nothing to do here.
  if (hasAcceptedUndertaking(introducer)) redirect('/introducer');

  const reAccepting = Boolean(introducer.terms_accepted_at);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Before you start</h1>
        <p className="mt-2 text-base text-gray-600">
          {reAccepting
            ? 'We’ve updated how this works. Have a read and confirm you’re happy — it takes a minute.'
            : 'How the Kira introducer arrangement works, in five points. No small print.'}
        </p>
      </header>

      <ol className="space-y-6">
        {UNDERTAKING_CLAUSES.map((clause, index) => (
          <li key={clause.heading} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
              {index + 1}
            </span>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{clause.heading}</h2>
              <p className="mt-1 text-base leading-relaxed text-gray-600">{clause.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <AcceptUndertakingForm defaultOrgName={introducer.org_name ?? ''} />
        <p className="mt-4 text-sm text-gray-500">
          We record that you accepted this, and when. Version {UNDERTAKING_VERSION}.
        </p>
      </div>
    </div>
  );
}
