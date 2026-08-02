// app/terms/page.tsx
//
// The Terms. Content lives in lib/terms.ts so this page, the signup checkbox and the recorded
// acceptance all reference the same version — a page that drifts from what people actually agreed
// to is worse than none, because it looks authoritative.

import Link from 'next/link';

import { TERMS_SECTIONS, TERMS_UPDATED, TERMS_VERSION } from '@/lib/terms';

export const metadata = {
  title: 'Terms · Kira',
  description: 'The terms that govern your use of Kira.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Terms</h1>
          <p className="mt-2 text-sm text-gray-500">
            Last updated {TERMS_UPDATED} · version {TERMS_VERSION}
          </p>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-gray-600">
            The short version: Kira remembers what you tell her so she can be useful, your business
            is yours, you can leave whenever you like, and we will not email you things you did not
            ask for.
          </p>
        </header>

        <div className="space-y-9">
          {TERMS_SECTIONS.map((section, index) => (
            <section key={section.heading}>
              <h2 className="text-xl font-semibold text-gray-900">
                {index + 1}. {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mt-3 text-base leading-relaxed text-gray-600">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-gray-200 pt-6 text-sm text-gray-500">
          <p>Corporate AI Solutions · legal@corporateaisolutions.com</p>
          <p className="mt-3">
            <Link href="/" className="font-medium text-violet-700 underline">
              Back to Kira
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
