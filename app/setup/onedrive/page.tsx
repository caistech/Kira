// Connecting OneDrive.
//
// The twin of ../drive/page.tsx, and it exists because roughly two thirds of the known contact base
// runs on Microsoft rather than Google — including the live first-customer lead. An owner whose
// twenty quotes live in OneDrive got nothing from a Drive-only product.
//
// Reached from /setup/documents, which suggests a provider and lets him choose. It is also reachable
// directly, deliberately: an owner who knows perfectly well where his files are should not have to
// walk through a chooser to say so.

import Link from 'next/link';

import { getCurrentAppUser } from '@/lib/auth';
import { OneDriveConnectForm } from '@/components/OneDriveConnectForm';

export const metadata = { title: 'Connect OneDrive · Kira' };
export const dynamic = 'force-dynamic';

export default async function ConnectOneDrivePage() {
  const user = await getCurrentAppUser();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Connect your Microsoft account</h1>
        <p className="mt-2 text-base leading-relaxed text-gray-700">
          When you ask Kira for a quote, she writes it in <em>your</em> format — the one your existing
          quotes already use — instead of inventing one. To do that she needs to read the documents
          you have written. You choose how much she can see, and you can disconnect at any time.
        </p>
        {/*
          One part, not three. The Google page names files, contacts and email because Google's
          request covers all three; this one asks only for files, so saying "there are three parts to
          it" here would describe a screen he is not about to see.
        */}
        <p className="mt-2 text-base leading-relaxed text-gray-700">
          This connection is about <strong>your files</strong> and nothing else. Your email and your
          contacts are not included, and Microsoft will not ask you for them.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">What she does with it</h2>
        <ul className="mt-3 space-y-2 text-base text-gray-700">
          <li>Reads documents you already wrote — quotes, letters, proposals — to learn how you write them.</li>
          <li>Shows you the format she has learned and waits for you to approve it before using it.</li>
          <li>Saves finished documents back into your OneDrive, so the work is yours and stays yours.</li>
          <li>Never sends anything to anyone without your approval.</li>
        </ul>
        {/*
          A REAL LIMIT, SAID BEFORE HE CONNECTS RATHER THAN DISCOVERED AFTER. Graph downloads a .docx
          happily and cannot convert it to text — it converts to PDF only — so the "learn your format"
          promise does not yet reach Word files on this platform, which is where most of his quotes
          will be. Saying so here costs a little enthusiasm and buys the thing the product is actually
          selling. Remove this paragraph when the shared text extractor lands, not before.
        */}
        <p className="mt-3 text-base text-gray-600">
          One thing worth knowing up front: she can read plain text, CSV and web documents today.
          Word files are on the list and not there yet — if that is where your quotes live, connect
          anyway and she will tell you what she can and cannot open rather than guessing.
        </p>
      </section>

      {user?.id ? (
        <OneDriveConnectForm defaultEmail={(user.email as string) ?? ''} />
      ) : (
        <p className="text-base text-gray-700">
          <Link href="/login" className="underline">
            Sign in
          </Link>{' '}
          to connect your OneDrive.
        </p>
      )}

      <p className="mt-6 text-center text-base text-gray-600">
        Your documents somewhere else?{' '}
        <Link href="/setup/documents" className="underline">
          Tell us where
        </Link>
        .
      </p>
    </div>
  );
}
