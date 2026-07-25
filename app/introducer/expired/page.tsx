// app/introducer/expired/page.tsx
//
// Where every failed introducer sign-in lands: unknown link, expired link, revoked link, suspended
// account. One destination and one message on purpose — telling someone WHICH of those it was
// would confirm to an attacker which tokens exist.

export const metadata = { title: 'Link expired · Kira' };

export default function IntroducerExpiredPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">That link isn&apos;t working</h1>
      <p className="mt-3 text-base text-gray-600">
        Sign-in links last seven days and can only be used from the account they were sent to. Ask
        for a fresh one and it&apos;ll arrive in a moment.
      </p>
      <p className="mt-6 text-base text-gray-600">
        Email{' '}
        <a className="font-medium text-teal-700 underline" href="mailto:hello@corporateaisolutions.com">
          hello@corporateaisolutions.com
        </a>{' '}
        and we&apos;ll send another.
      </p>
    </div>
  );
}
