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

    // ⚠️ REPLACED, NOT DELETED — 2026-08-15. This asserted the dashboard REDIRECTED an empty account
    // to /start. That redirect is gone, and the intent it protected is not: a new owner must never
    // be left on a dashboard reporting on nothing. It is now met by rendering the outstanding step
    // in place (lib/onboarding/gate.ts) instead of ejecting him to a differently-styled page.
    //
    // Deleting this would have dropped the only guard on that intent. So it pins the new mechanism
    // and, below, that the old one has not crept back.
    it('leads an empty account in, by gating in place rather than redirecting', () => {
      expect(dashboard).toMatch(/nextOnboardingStep\(/);
      expect(dashboard).toMatch(/<OnboardingGate/);
    });

    it('no longer ejects him to /start', () => {
      // The specific line that sent a paying owner somewhere he had not asked for, in a palette
      // that made it look like a different product.
      expect(dashboard).not.toMatch(/list\.length === 0 && !valuation\)\s*redirect\(/);
    });

    it('leaves an owner who HAS a valuation on his own dashboard', () => {
      expect(dashboard).not.toMatch(/if\s*\(\s*user\s*&&\s*list\.length === 0\s*\)\s*redirect\(/);
    });
  });

  describe('both entry paths land in the same place', () => {
    const onboarding = stripComments(repo('app/onboarding/page.tsx'));
    const beta = stripComments(repo('components/BetaRedeem.tsx'));

    // ⚠️ REPLACED, NOT DELETED — 2026-08-15. This asserted onboarding sent the just-paid owner to
    // `/start?journey=business&from=paid`, and it was RIGHT to pin that while the destination
    // carried the framing. It no longer does: both paid and beta go to `/dashboard?welcome=1`, and
    // `welcome=1` is what marks him as just-arrived. The framing moved; the requirement that he BE
    // framed did not, so this pins the new carrier.
    //
    // The stronger property is the second one: two entry paths pointing at different destinations is
    // what made the ROUTE decide what he saw rather than his state, which is the defect the gate
    // exists to end.
    it('the paid path still marks the just-arrived owner as just-arrived', () => {
      expect(onboarding).toMatch(/\/dashboard\?welcome=1/);
    });

    it('the beta path lands in the same place as the paid path', () => {
      expect(beta).toMatch(/\/dashboard\?welcome=1/);
    });

    it('neither entry path routes around the dashboard into /start', () => {
      for (const [name, src] of [['onboarding', onboarding], ['BetaRedeem', beta]] as const) {
        expect(src, `${name} still sends the owner to /start`).not.toMatch(
          /location\.assign\(\s*['"`]\/start\?journey=business/,
        );
      }
    });
  });
});
