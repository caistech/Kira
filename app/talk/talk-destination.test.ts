// "Talk to Kira" must always lead somewhere that works.
//
// THE DEFECT THIS PINS. Every Talk control in the product points at `/talk`: the floating button on
// every authenticated page, the My Genome empty state, the Knowledge link. On a brand-new account
// there is no `kira_agents` row, and `/talk` redirected to `/dashboard` — so the button that names
// the entire product returned a new owner to the page he was already on, with no message. Verified
// three ways in Ray's walkthrough, 6 August 2026: *"I'd assume it's broken, and I'd assume the rest
// is too."*
//
// It survived because the two halves disagreed and only one was ever read. `/dashboard` computes
// `talkHref = businessAgent ? '/chat/<id>' : '/start?journey=business'`, so ITS buttons always led
// somewhere; `/talk` did not, and `/talk` is what the FAB uses.
//
// A source assertion rather than a rendered one: `/talk` is a server component that reaches Supabase
// and returns another page's component, so rendering it in vitest would test the harness. What can
// be asserted cheaply is the thing that broke — the destination for an owner with no agent — and
// that the two surfaces still agree.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repo = (p: string) => readFileSync(path.resolve(__dirname, '../..', p), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('/talk when the owner has no Kira yet', () => {
  const talk = stripComments(repo('app/talk/page.tsx'));

  it('does not send him back to the dashboard he came from', () => {
    // The silent bounce. Every Talk control in the product routes through here, so this one
    // redirect is what made three separate CTAs do nothing.
    expect(talk).not.toMatch(/redirect\(\s*['"`]\/dashboard['"`]\s*\)/);
  });

  it('sends him to the flow that creates her, with the journey already chosen', () => {
    // `?journey=business` matters: without it he lands on a bare "choose a journey" picker, which is
    // the complaint that caused the previous fix and produced the silent bounce.
    expect(talk).toMatch(/redirect\(\s*['"`]\/start\?journey=business['"`]\s*\)/);
  });

  it('agrees with the destination /dashboard already uses for the same case', () => {
    // One product, one answer. The dashboard had the right one all along; /talk was the loser.
    const dashboard = stripComments(repo('app/dashboard/page.tsx'));
    expect(dashboard).toContain("'/start?journey=business'");
  });
});
