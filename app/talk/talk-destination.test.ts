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

  // ⚠️ THESE TWO ASSERTIONS WERE INVERTED ON 2026-08-12, AND THE REASON MATTERS MORE THAN THE CHANGE.
  //
  // They used to require `/talk → /start?journey=business` and FORBID `/talk → /dashboard`, because
  // Ray hit the silent bounce: the button naming the entire product returned him to the page he was
  // already on, with no message. That was correct then. `/dashboard` was a dead end for a new owner.
  //
  // It is not a dead end any more. Since 2026-08-10 the dashboard forwards an account with NO AGENT
  // AND NO VALUATION straight into `/start?journey=business&from=app`, so the bounce cannot happen to
  // the owner who reported it.
  //
  // What DID break is the opposite person. An owner with a saved valuation signs in, login sets
  // `next=/talk`, and this redirect dropped him into a setup flow having never seen the gap figure he
  // came back for — defeating the scoping the dashboard redirect was deliberately given ("a gap
  // figure someone came for isn't snatched away"). Reported by the operator, 2026-08-12.
  //
  // So the destination decision moved to the ONE surface that knows what else he has. This file now
  // pins the composition rather than the hop.
  it('sends him home, and lets the dashboard decide where home is', () => {
    expect(talk).toMatch(/redirect\(\s*['"`]\/dashboard['"`]\s*\)/);
  });

  it('does NOT route around the dashboard into setup', () => {
    // The regression this replaces. Going straight to /start skips the one surface that knows
    // whether he has a valuation waiting, and sends a returning owner into onboarding.
    expect(talk).not.toMatch(/redirect\(\s*['"`]\/start\?journey=business['"`]\s*\)/);
  });

  it('the composition still terminates', () => {
    // /talk → /dashboard → /start is only safe while /start never routes back, and while the
    // dashboard's forward is conditional. Both are asserted where they live — dashboard:
    // `list.length === 0 && !valuation` below, and /start pushes forward to /setup/draft only.
    // Asserted here as the thing that would make this hop a loop: /talk must not be a destination
    // the dashboard can send someone to.
    const dashboard = stripComments(repo('app/dashboard/page.tsx'));
    expect(dashboard).not.toMatch(/redirect\(\s*['"`]\/talk['"`]\s*\)/);
  });

  // ⚠️ THIS BLOCK REPLACED A `toContain("'/start?journey=business'")` ASSERTION THAT WENT RED WHEN
  // THE DASHBOARD GAINED A QUERY PARAM, AND IT WAS RIGHT TO GO RED.
  //
  // The original demanded the exact literal, so ANY param broke it — including a correct one. That
  // made it a spelling test rather than an agreement test, and it stayed red on main for a day
  // because "the two surfaces agree" and "the two surfaces are byte-identical" are not the same
  // claim.
  //
  // What it should assert is the thing that can actually hurt an owner: the same PATH and the same
  // journey, plus the framing flag being right for who is arriving. Deleting it and asserting
  // nothing would have been the easy read of a red test.
  describe('the dashboard sends the same owner to the same place', () => {
    const dashboard = stripComments(repo('app/dashboard/page.tsx'));

    it('agrees on the destination, whatever framing params ride along', () => {
      // One product, one answer. The dashboard had the right one all along; /talk was the loser.
      expect(dashboard).toMatch(/['"`]\/start\?journey=business(&[^'"`]*)?['"`]/);
    });

    it('does not tell a long-standing owner he has just paid', () => {
      // `from=paid` makes /start announce "Last step — let's set up your Kira. About three
      // minutes." Correct for a man who has just handed over a card; wrong for one who has been
      // using the product for months and pressed Talk. The dashboard branch is the RECOVERY route —
      // its own comment said so while the link said the opposite, and the two files contradicted
      // each other in the tree for a day.
      expect(dashboard).not.toMatch(/\/start\?journey=business&from=paid/);
    });

    it('still marks him as coming from inside the product', () => {
      // Without a `from`, /start offers "Back to home" pointing at the marketing landing page — a
      // signed-in owner sent to the shop window. `from=app` is the convention the valuation result
      // page already uses for "he is already a customer".
      expect(dashboard).toMatch(/\/start\?journey=business&from=app/);
    });
  });

  // An invited owner arrives with an account and nothing in it. Until 2026-08-10 the dashboard
  // showed him a report on a business it knew nothing about and waited to be clicked, while the
  // paid path took its owner straight into the flow that creates her. Same product, two arrivals,
  // one of them led.
  describe('an account with nothing in it is led in rather than parked', () => {
    const dashboard = stripComments(repo('app/dashboard/page.tsx'));

    it('sends an owner with no agent and no valuation into the create flow', () => {
      expect(dashboard).toMatch(
        /if\s*\(\s*user\s*&&\s*list\.length === 0\s*&&\s*!valuation\s*\)\s*redirect\(\s*['"`]\/start\?journey=business&from=app['"`]\s*\)/,
      );
    });

    it('leaves an owner who HAS a valuation on his own dashboard', () => {
      // The load-bearing half, and the one a later tidy-up would drop as a redundant condition.
      // Dropping `!valuation` turns this into the failure the redirect was written to avoid: a man
      // who came for his gap figure, bounced off it every time he opens the page. Two redirects on
      // this surface have already done exactly that to real people.
      expect(dashboard).not.toMatch(/if\s*\(\s*user\s*&&\s*list\.length === 0\s*\)\s*redirect\(/);
    });
  });

  describe('the paid path keeps its own framing', () => {
    it('onboarding still marks the just-paid owner as just-paid', () => {
      // The other half of the split: separating these two must not quietly demote the paid arrival
      // to a generic one, which would lose the "last step" framing that the 08-08 walk added.
      const onboarding = stripComments(repo('app/onboarding/page.tsx'));
      expect(onboarding).toMatch(/\/start\?journey=business&from=paid/);
    });
  });
});
