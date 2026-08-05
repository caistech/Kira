// app/introducer/expired/page.tsx
//
// Where every failed introducer sign-in lands: unknown link, expired link, revoked link, suspended
// account. One destination and one message on purpose — telling someone WHICH of those it was
// would confirm to an attacker which tokens exist.
//
// It used to end here, offering only "email us and we'll send another". That made an advisor wait
// on a person to see their own status board, every eighth day, which undercuts the thing /advisors
// sells them. The form below is the same resend the admin panel already had, reachable by the
// person who actually needs it.

import Link from 'next/link';
import RequestLinkForm from './RequestLinkForm';
import { CORPORATE_AI_SOLUTIONS } from '@/components/KiraBranding';

export const metadata = { title: 'Link expired · Kira' };

export default function IntroducerExpiredPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">That link isn&apos;t working</h1>
      <p className="mt-3 text-base text-gray-600">
        Sign-in links last seven days and can only be used from the account they were sent to. Put
        your email in below and a fresh one will arrive in a moment — you don&apos;t need to wait on
        anyone.
      </p>

      <RequestLinkForm />

      {/* THE VISITOR THIS PAGE DID NOT ACCOUNT FOR.
          Everything above assumes an existing introducer whose link lapsed. For the next few weeks
          the likeliest arrival is the opposite: a broker who was pitched, has never been invited,
          and types their address into the form.

          The resend is deliberately neutral — it answers identically whether or not the address
          belongs to an account, because saying otherwise would confirm to a stranger who holds one.
          That design is right and must not change. But it means a never-invited broker is told a
          link "is on its way", waits, checks spam, waits again, and concludes the product is broken.
          The truth is only that nobody added them yet, and there is nothing on the page that could
          tell them so.

          Copy closes it, not code: a second path for the person the first path cannot serve. */}
      <p className="mt-6 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Haven&apos;t been invited yet?{' '}
        <Link className="font-medium text-violet-700 underline" href="/advisors">
          Apply here
        </Link>{' '}
        — takes a minute, and we&apos;ll set you up. If no link arrives above, this is almost
        certainly why.
      </p>

      <p className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-500">
        {/* A REAL MAILBOX. This said hello@corporateaisolutions.com, which nobody reads — and it sat
            under the words "a human will sort it out", on the page someone reaches only because they
            are already locked out. An address that bounces there is worse than no address: it costs
            the reader their last attempt and tells them the offer of help was decorative. */}
        Still stuck? Email{' '}
        <a
          className="font-medium text-violet-700 underline"
          href={`mailto:${CORPORATE_AI_SOLUTIONS.email}`}
        >
          {CORPORATE_AI_SOLUTIONS.email}
        </a>{' '}
        and a human will sort it out.
      </p>
    </div>
  );
}
