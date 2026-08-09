import { describe, expect, it } from 'vitest';

import { startFraming } from './start-framing';

describe('startFraming', () => {
  it('tells the just-paid owner this is the last step', () => {
    const f = startFraming('paid');
    expect(f.isPaidArrival).toBe(true);
    expect(f.cameFromApp).toBe(true);
  });

  // THE BUG THIS FILE EXISTS FOR. The dashboard's recovery route passed `from=paid`, so an owner
  // months into the product who pressed "Talk to Kira" was told he had just paid.
  it('does NOT tell an owner arriving from the dashboard that he has just paid', () => {
    const f = startFraming('app');
    expect(f.isPaidArrival).toBe(false);
    expect(f.cameFromApp).toBe(true);
  });

  it('sends both in-product arrivals back to the dashboard, not the marketing page', () => {
    // The half that was RIGHT about `from=paid` on the dashboard link and had to survive the split:
    // a signed-in owner offered "Back to home" lands on the shop window he already walked through.
    expect(startFraming('paid').cameFromApp).toBe(true);
    expect(startFraming('app').cameFromApp).toBe(true);
  });

  describe('anything else is a visitor', () => {
    it.each([null, undefined, '', 'PAID', 'Paid', 'app ', 'onboarding', 'true'])(
      'treats %p as an ordinary arrival',
      (from) => {
        const f = startFraming(from as string | null | undefined);
        expect(f.isPaidArrival).toBe(false);
        expect(f.cameFromApp).toBe(false);
      },
    );

    it('defaults conservatively — the wrong direction claims a stranger has paid', () => {
      // If an unknown value ever resolved to a paid arrival, "Last step — let's set up your Kira"
      // would greet someone who has handed over nothing.
      expect(startFraming('anything-at-all').isPaidArrival).toBe(false);
    });
  });
});
