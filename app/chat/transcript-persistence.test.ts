// "Where did what I said go?" — the transcript, and the counter that said it never happened.
//
// Ray, walking production 2026-08-16: "The transcript was gone. Blank page, 'Ready when you are'.
// Meanwhile the voice panel beside it says 'Welcome back — Kira remembers where you left off'. She
// does remember… but I can't see any of it. On a phone-sized screen my dashboard also shows the
// agent as '0 conversations' after I'd had one."
//
// ⚠️ THE INVESTIGATION WENT WRONG FIRST, AND THAT IS WORTH KEEPING. The obvious hypothesis was that
// the typed turns were not being persisted, and a probe of `kira_messages` found ZERO rows and
// seemed to confirm it — so the route's insert was "fixed" from `kira_agent_id` to `agent_id`.
// That was a regression on a working path. There are two tables:
//
//   conversation_messages   the live transcript. 4,258 rows. BOTH columns exist; `kira_agent_id` is
//                           the populated one. Ray's ten messages were in here the whole time.
//   kira_messages           dead since January 2026, keyed by the ElevenLabs `conv_…` string.
//
// Persistence was never broken. Nothing READ it back. These tests pin both halves so the wrong
// diagnosis cannot be re-reached from the same starting point.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { stripComments } from '@/lib/source-scan';

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (rel: string) => stripComments(readFileSync(path.join(repoRoot, rel), 'utf8'));

describe('the typed turn is written to the LIVE table, with the populated column', () => {
  const route = read('app/api/kira/chat/text/route.ts');

  it('⚠️ stamps kira_agent_id, not agent_id', () => {
    // Renaming this breaks a path that works. Both columns exist on `conversation_messages`; only
    // this one is populated, and the voice path writes it too.
    expect(route).toMatch(/kira_agent_id: agent\.id/);
  });

  it('never writes to the dead kira_messages table', () => {
    expect(route).not.toMatch(/kira_messages/);
  });
});

describe('the transcript is read back', () => {
  const chat = read('app/chat/[agentId]/page.tsx');
  const history = read('app/api/kira/chat/history/route.ts');

  it('the chat page hydrates from history on mount', () => {
    // THE ACTUAL DEFECT. `typed` was useState([]) and nothing filled it, so navigating away and back
    // showed an empty box over a full database.
    expect(chat).toMatch(/api\/kira\/chat\/history/);
  });

  it('⚠️ hydration never lands on top of a live conversation', () => {
    // If he has already typed something this visit, that is the conversation — history arriving
    // late must not replace it. The functional update is what makes that safe.
    expect(chat).toMatch(/setTyped\(\(current\) => \(current\.length \? current : /);
  });

  it('history resolves identity from the session, never the query string', () => {
    // This returns a man's own words about selling his business. A ?userId= here hands them to
    // anyone who guesses a uuid.
    expect(history).toMatch(/getCurrentOrganisationContext\(\)/);
    expect(history).not.toMatch(/searchParams\.get\('userId'\)/);
  });

  it('history scopes the agent to the signed-in owner as a FILTER', () => {
    // Scoped rather than checked afterwards, so there is no path where another owner's row is
    // even fetched.
    expect(history).toMatch(/\.eq\('organisation_id', organisationId\)/);
  });

  it('history degrades to an empty transcript rather than an error page', () => {
    // He came to talk to her. A missing receipt is a smaller loss than a broken screen.
    expect(history).toMatch(/messages: \[\]/);
  });
});

describe('the conversation counter counts something real', () => {
  const dashboard = read('app/dashboard/page.tsx');

  it('⚠️ does not read the stored column, which has no writer', () => {
    // `kira_agents.total_conversations` is read in three places and incremented in none, so it sits
    // at 0 forever — the same defect class as readiness never recomputing and ensureTrial having no
    // caller. Derived rather than back-filled with a writer, because two paths create conversations
    // (the voice webhook and the typed route) and a counter incremented at one of them drifts.
    expect(dashboard).not.toMatch(/Number\(a\.total_conversations \?\? 0\)\} conversation/);
  });

  it('derives the count from the conversations table', () => {
    expect(dashboard).toMatch(/conversationCounts/);
    expect(dashboard).toMatch(/from\('conversations'\)/);
  });
});
