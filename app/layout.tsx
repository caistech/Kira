import type { Metadata, Viewport } from 'next';
import { SayFixWidget } from "@caistech/sayfix-embed";
import { Inter, DM_Sans, Outfit } from 'next/font/google';
import './globals.css';
import { SiteHeader, SiteFooter } from '@/components/corporate/SiteHeader';
import { AgentJsonLd } from '@caistech/webmcp-kit/react';
import { agentConfig } from '@/agent-readiness.config';
import { RegisterSW } from '@/components/RegisterSW';

const inter = Inter({ subsets: ['latin'] });

/**
 * DM Sans and Outfit, SELF-HOSTED — K5/P3.
 *
 * Five page files each carried `@import url('https://fonts.googleapis.com/…')` inside a <style>
 * element in the BODY: /genome, /business-valuation, /plan, /onboarding and LandingClassic. Those
 * are precisely the pages a tester called slow, and an @import in a body <style> is the worst
 * shape available for a webfont — a render-blocking stylesheet the preload scanner cannot see,
 * discovered only once the HTML around it has been parsed, on a third-party origin with no
 * preconnect, which then triggers a SECOND request for the font files themselves.
 *
 * `next/font` self-hosts the files and inlines the @font-face at build time, so the third-party
 * request disappears entirely rather than getting faster. `display: 'swap'` keeps text visible
 * while they load, which is the half that decides whether a page looks broken or merely plain.
 *
 * ⚠️ THIS IS A STRUCTURAL FIX, NOT A MEASURED ONE, AND THE DISTINCTION IS DELIBERATE. Timing this
 * from here is worthless: sampling production returned 0.3s to 8.6s for the same cached 33KB
 * document, and a control against an unrelated host returned the same spread, so the variance was
 * this link and not the product. What can be established without a network is the SHAPE of the
 * dependency, and removing it helps every visitor regardless of whose connection was to blame.
 */
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-body' });
const outfit = Outfit({ subsets: ['latin'], display: 'swap', variable: '--font-display' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Kira — your part-time general manager',
  description: 'Kira is your part-time general manager: talk to her a few minutes at a time and she captures what\'s in your head, remembers everything, and quietly builds the systems that make your business worth more.',
  keywords: ['part-time general manager', 'fractional executive', 'business valuation', 'voice AI', 'business genome'],
  openGraph: {
    title: 'Kira — your part-time general manager',
    description: 'Talk to Kira a few minutes at a time; she captures what\'s in your head, remembers everything, and builds the systems that make your business worth more.',
    images: ['/female_avatar.jpeg'],
  },
  // PWA / installable app
  applicationName: 'Kira',
  appleWebApp: { capable: true, title: 'Kira', statusBarStyle: 'default' },
  icons: { icon: '/favicon.ico', apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#fb7185',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${outfit.variable}`}>
      <body className={inter.className}>
        <RegisterSW />
        <AgentJsonLd config={agentConfig} />
        <div className="min-h-screen flex flex-col">
          <SiteHeader />
          {/* No `position` — the widget auto-places, avoiding controls it would otherwise cover.
              It USED to be pinned bottom-left to dodge the bottom-right CTAs (naive-tester
              2026-07-20), but a hardcoded position is handed to the engine as a *preference* and
              weighted in its favour, so pinning it left is what kept it parked on the Back button
              through the whole eleven-question valuation (naive-tester 2026-07-27). The engine
              exists to make this decision per page; giving it a thumb on the scale defeated it.
              The other half of that collision — the "Ask Kira" pill sitting on Next — is gone; see
              the note at the foot of app/business-valuation/page.tsx. */}
          <main className="flex-1">{children}<SayFixWidget repo="kira" /></main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
