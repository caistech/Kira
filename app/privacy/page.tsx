// @public-route
// app/privacy/page.tsx
//
// Deliberately the same shape as app/terms/page.tsx — content from lib/privacy.ts, same header,
// same numbering, same footer. Two legal pages that look like they came from different products
// undermine both.

import Link from 'next/link';

import { OPERATOR, PRIVACY_SECTIONS, PRIVACY_UPDATED, PRIVACY_VERSION } from '@/lib/privacy';

export const metadata = {
  title: 'Privacy · Kira',
  description: 'How Kira handles your personal and business information.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Privacy</h1>
          <p className="mt-2 text-sm text-gray-500">
            Last updated {PRIVACY_UPDATED} · version {PRIVACY_VERSION}
          </p>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-gray-600">
            The short version: what you tell Kira stays with your account, the advisor who
            introduced you sees your progress and never your contents, your turnover and profit are
            not sold or shared, and you can take any of it back.
          </p>
        </header>

        <div className="space-y-9">
          {PRIVACY_SECTIONS.map((section, index) => (
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
          <p>
            {OPERATOR.entity} · ABN {OPERATOR.abn} · trading as {OPERATOR.tradingAs}
          </p>
          <p className="mt-1">
            {OPERATOR.postal} · {OPERATOR.email}
          </p>
          <p className="mt-3">
            <Link href="/terms" className="font-medium text-violet-700 underline">
              Terms
            </Link>
            {' · '}
            <Link href="/" className="font-medium text-violet-700 underline">
              Back to Kira
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
