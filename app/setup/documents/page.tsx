// Where does your work live? — the front door to connecting anything.
//
// ⚠️ THIS PAGE SUGGESTS. IT DOES NOT ROUTE. The distinction is the whole design.
//
// `detectDocumentProvider` reads the MX record on the owner's business domain, which reliably says
// where his MAIL runs. It does not say where his DOCUMENTS are — Microsoft 365 for mail with Dropbox
// for files is ordinary in trades. So the detected provider is pre-selected and listed first, the
// other is always visible beside it, and the reasoning is printed in one sentence so he can see it is
// a guess and correct it.
//
// Auto-routing on that signal would put a man who has never had a Microsoft account in front of a
// Microsoft login, at the most abandonment-prone moment in the product, with an error he cannot
// interpret. He would not report it; he would stop. It is also the /setup/drive defect in a new
// costume — that page said Drive and Google asked for his address book. He never chose Microsoft,
// and now Microsoft is asking.
//
// The third option is not a fallback. A large part of this ICP is on bigpond with their quotes on a
// desktop, and before this page they had no path at all.

import Link from 'next/link';

import { getCurrentAppUser } from '@/lib/auth';
import { detectDocumentProvider, type DocumentProvider } from '@/lib/business-identity/mail-provider';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { OtherProviderForm } from '@/components/OtherProviderForm';

export const metadata = { title: 'Where your documents live · Kira' };
export const dynamic = 'force-dynamic';

interface Choice {
  provider: DocumentProvider;
  href: string;
  title: string;
  blurb: string;
}

const CHOICES: Choice[] = [
  {
    provider: 'google',
    href: '/setup/drive',
    title: 'Google Drive',
    blurb: 'You sign in with a Google account, and your documents live in Google Drive or Google Docs.',
  },
  {
    provider: 'microsoft',
    href: '/setup/onedrive',
    title: 'OneDrive',
    blurb:
      'You sign in with a Microsoft account, and your documents live in OneDrive, SharePoint, or Word and Excel files.',
  },
];

export default async function DocumentsSetupPage() {
  const user = await getCurrentAppUser();

  // ⚠️ THE DOMAIN IS ON `business_identity`, NOT ON THE USER ROW. `getCurrentAppUser` does
  // `select('*')` and is untyped, so reading a made-up field off it compiles, renders, and is
  // `undefined` forever — detection would silently fall back to the account email and guess Google
  // for an owner whose business runs on Microsoft. That is the exact case
  // mail-provider.test.ts pins.
  //
  // `sending_domain` is his WEBSITE domain, asked for rather than derived, which is the right one to
  // read: a business on Microsoft 365 or Google Workspace runs its mail on that domain, and a
  // business whose mail is at bigpond has no MX there to find — which correctly yields "we do not
  // know" rather than a wrong guess.
  //
  // Identity read failures throw by design (a read failure must not read as "no identity"), so this
  // is caught: a detection nicety must never take down the page it is decorating.
  let sendingDomain: string | null = null;
  if (user?.id) {
    try {
      sendingDomain = (await getBusinessIdentity(user.id as string))?.sending_domain ?? null;
    } catch {
      sendingDomain = null;
    }
  }

  // Never throws, never blocks longer than its own timeout. A detection failure renders as "we do not
  // know", which is an honest state and not an error.
  const detection = user?.id
    ? await detectDocumentProvider({
        accountEmail: (user.email as string) ?? null,
        businessDomain: sendingDomain,
      })
    : { provider: null, confidence: 'low' as const, basis: 'unknown' as const, explanation: null };

  // Suggested first, and only when there is a suggestion. With none, the original order stands rather
  // than an arbitrary one — a page that reorders itself for no visible reason is unsettling.
  const ordered = detection.provider
    ? [...CHOICES].sort((a, b) => Number(b.provider === detection.provider) - Number(a.provider === detection.provider))
    : CHOICES;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Where does your work live?</h1>
        <p className="mt-2 text-base leading-relaxed text-gray-700">
          When you ask Kira for a quote, she writes it in <em>your</em> format — the one your existing
          quotes already use — instead of inventing one. To do that she needs to read the documents
          you have already written, so the first question is where they are.
        </p>
      </header>

      {/*
        THE GUESS IS SHOWN, NOT HIDDEN. He is entitled to know why one option is sitting at the top,
        and seeing the reasoning is what lets him notice it is about his EMAIL and override it. A
        silent reorder is a decision made about him that he cannot argue with.
      */}
      {detection.explanation ? (
        <p className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-700">
          {detection.explanation}{' '}
          <span className="text-gray-500">
            It is only a guess from where your email runs — if your files are somewhere else, pick the
            other one.
          </span>
        </p>
      ) : null}

      <div className="space-y-4">
        {ordered.map((choice) => {
          const suggested = choice.provider === detection.provider;
          return (
            <Link
              key={choice.provider}
              href={choice.href}
              className={`block min-h-[44px] rounded-2xl border p-6 hover:border-gray-400 ${
                suggested ? 'border-gray-900 bg-white' : 'border-gray-200 bg-white'
              }`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-semibold text-gray-900">{choice.title}</span>
                {suggested ? (
                  <span className="shrink-0 rounded-full bg-gray-900 px-3 py-1 text-sm font-medium text-white">
                    Most likely yours
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-base text-gray-600">{choice.blurb}</span>
            </Link>
          );
        })}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Neither of those?</h2>
        <p className="mt-1 mb-4 text-base text-gray-600">
          That is common, and it is worth telling us — what people say here is what decides which one
          we build next.
        </p>
        <OtherProviderForm />
      </section>
    </div>
  );
}
