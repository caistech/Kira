import type { Metadata, Viewport } from 'next';
import { SayFixWidget } from "@caistech/sayfix-embed";
import { Inter } from 'next/font/google';
import './globals.css';
import { CorporateHeader } from '@/components/corporate/CorporateHeader';
import { CorporateFooter } from '@/components/corporate/CorporateFooter';
import { AgentJsonLd } from '@caistech/webmcp-kit/react';
import { agentConfig } from '@/agent-readiness.config';
import { RegisterSW } from '@/components/RegisterSW';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Kira — your fractional exec',
  description: 'Kira is your fractional exec: talk to her a few minutes at a time and she captures what\'s in your head, remembers everything, and quietly builds the systems that make your business worth more.',
  keywords: ['fractional executive', 'AI chief of staff', 'business valuation', 'voice AI', 'business genome'],
  openGraph: {
    title: 'Kira — your fractional exec',
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
    <html lang="en">
      <body className={inter.className}>
        <RegisterSW />
        <AgentJsonLd config={agentConfig} />
        <div className="min-h-screen flex flex-col">
          <CorporateHeader productName="Kira" productAcronym="K" />
          {/* No `position` — the widget auto-places, avoiding controls it would otherwise cover.
              It USED to be pinned bottom-left to dodge the bottom-right CTAs (naive-tester
              2026-07-20), but a hardcoded position is handed to the engine as a *preference* and
              weighted in its favour, so pinning it left is what kept it parked on the Back button
              through the whole eleven-question valuation (naive-tester 2026-07-27). The engine
              exists to make this decision per page; giving it a thumb on the scale defeated it.
              The other half of that collision — the "Ask Kira" pill sitting on Next — is gone; see
              the note at the foot of app/business-valuation/page.tsx. */}
          <main className="flex-1">{children}<SayFixWidget repo="kira" /></main>
          <CorporateFooter productName="Kira" />
        </div>
      </body>
    </html>
  );
}
