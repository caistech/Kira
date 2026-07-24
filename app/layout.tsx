import type { Metadata } from 'next';
import { SayFixWidget } from "@caistech/sayfix-embed";
import { Inter } from 'next/font/google';
import './globals.css';
import { CorporateHeader } from '@/components/corporate/CorporateHeader';
import { CorporateFooter } from '@/components/corporate/CorporateFooter';
import { AgentJsonLd } from '@caistech/webmcp-kit/react';
import { agentConfig } from '@/agent-readiness.config';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AgentJsonLd config={agentConfig} />
        <div className="min-h-screen flex flex-col">
          <CorporateHeader productName="Kira" productAcronym="K" />
          {/* bottom-left: keeps the report pill clear of the bottom-right/center primary CTAs +
              voice controls it was dogpiling (naive-tester 2026-07-20). */}
          <main className="flex-1">{children}<SayFixWidget repo="kira" position="bottom-left" /></main>
          <CorporateFooter productName="Kira" />
        </div>
      </body>
    </html>
  );
}
