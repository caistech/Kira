'use client';

// The ICP demo, mounted on the landing page. Auto-advance, big targets, words not icons.
import { DemoPlayer } from '@/components/DemoPlayer';
import { ICP_BEATS } from '@/lib/genome/timeline';

export function LandingDemo() {
  return <DemoPlayer beats={ICP_BEATS} mode="auto" big />;
}
