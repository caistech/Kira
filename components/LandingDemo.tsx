'use client';

// The ICP demo, mounted on the landing page. Auto-advance, big targets, words not icons.
//
// SIX BEATS, NOT THIRTEEN (register P16, operator decision 2026-08-09). Ninety seconds of autoplay
// is a long time to ask a stranger for on a first visit, and the tester's own reading — "the words
// are carrying all of it" — is an argument for fewer and stronger rather than for better pictures.
// Which six, what was dropped, and the two swaps to reach for first: `ICP_BEATS_DEMO` in
// lib/genome/timeline.ts. `ICP_BEATS` still holds all thirteen.
import { DemoPlayer } from '@/components/DemoPlayer';
import { ICP_BEATS_DEMO } from '@/lib/genome/timeline';

export function LandingDemo() {
  return <DemoPlayer beats={ICP_BEATS_DEMO} mode="auto" big />;
}
