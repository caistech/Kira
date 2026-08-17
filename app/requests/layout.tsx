import { UserShell } from '@/components/UserShell';

export const metadata = {
  title: 'Requests · Kira',
};

// ⚠️ THE CHROME IS NOT OPTIONAL ON AN AUTHENTICATED ROUTE, and this file exists because the page
// shipped without it. /requests was added and merged with no layout, so it rendered with no nav, no
// Settings and no Sign Out — the §4 defect check-app-chrome.mjs was written for, committed by the
// same session that had just read that script's header explaining it.
//
// It reached production because `npx vitest` is not the gate: the chrome check is a standalone
// script run from gate.yml, so a green test suite says nothing about it. Caught minutes later by
// check-voice-reachable.mjs, which flagged the same route for the related reason (no shell above it
// means no TalkFab either, so the page had no route to Kira on top of having no nav).
export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  return <UserShell>{children}</UserShell>;
}
