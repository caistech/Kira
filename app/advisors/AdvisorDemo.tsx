'use client';

// Thin client wrapper so the advisors page can stay a server component.
import { DemoPlayer } from '@/components/DemoPlayer';
import { ADVISOR_BEATS } from '@/lib/genome/timeline';

export function AdvisorDemo() {
  return <DemoPlayer beats={ADVISOR_BEATS} mode="manual" />;
}
