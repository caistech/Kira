// Connecting Google Drive.
//
// This is the most sensitive thing the product ever asks for, and the ICP makes it more so: an owner
// thinking about selling, who often has not told his staff or his family. So the page does three
// things a normal OAuth button does not — it says what Kira reads it FOR, it makes the access level
// an explicit choice rather than a default, and it asks which Google account rather than assuming
// the one he signed up with.
//
// Why he'd say yes: the useful version of "quote Trinh for the platform work" is a quote in HIS
// format, and the only thing that knows what that is, is the last twenty quotes he has already
// written.

import Link from 'next/link';

import { getCurrentAppUser } from '@/lib/auth';
import { DriveConnectForm } from '@/components/DriveConnectForm';

export const metadata = { title: 'Connect Google Drive · Kira' };
export const dynamic = 'force-dynamic';

export default async function ConnectDrivePage() {
  const user = await getCurrentAppUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Let Kira read your Drive</h1>
        <p className="mt-2 text-base leading-relaxed text-gray-700">
          When you ask Kira for a quote, she writes it in <em>your</em> format — the one your existing
          quotes already use — instead of inventing one. To do that she needs to read the documents
          you have written. You choose how much she can see, and you can disconnect at any time.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">What she does with it</h2>
        <ul className="mt-3 space-y-2 text-base text-gray-700">
          <li>Reads documents you already wrote — quotes, letters, proposals — to learn how you write them.</li>
          <li>Shows you the format she has learned and waits for you to approve it before using it.</li>
          <li>Never sends anything to anyone without your approval.</li>
        </ul>
      </section>

      {user?.id ? (
        <DriveConnectForm defaultEmail={(user.email as string) ?? ''} />
      ) : (
        <p className="text-base text-gray-700">
          <Link href="/login" className="underline">
            Sign in
          </Link>{' '}
          to connect your Drive.
        </p>
      )}
    </div>
  );
}
