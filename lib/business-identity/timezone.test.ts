// Which clock the handover's dates are read in.
//
// THE BUG, found by pulling the real document off production on 2026-08-05: dates were rendered on a
// UTC server, so between Perth midnight and UTC midnight — a third of every day — every date in an
// Australian handover was a day behind. The filename said 4 August on the 5th.
//
// It matters here more than anywhere else in the product, because the dates are what make the
// document EVIDENCE rather than assertion. An accountant who finds one date disagreeing with his own
// record stops trusting the document, not the date.

import { describe, expect, it } from 'vitest';
import { AU_STATES, DEFAULT_TIME_ZONE, isoDateIn, longDateIn, timeZoneForState } from './index';

describe('timeZoneForState', () => {
  it('maps every state we accept — no state may fall through to the default', () => {
    // AU_STATES is the list the identity form offers. A new one added there without a zone here
    // would silently get Sydney, which is the bug in a smaller form.
    for (const state of AU_STATES) {
      expect(timeZoneForState(state), state).toMatch(/^Australia\//);
    }
    expect(timeZoneForState('WA')).toBe('Australia/Perth');
    expect(timeZoneForState('QLD')).toBe('Australia/Brisbane');
    expect(timeZoneForState('NT')).toBe('Australia/Darwin');
  });

  it('is forgiving about how the state arrives', () => {
    expect(timeZoneForState(' wa ')).toBe('Australia/Perth');
    expect(timeZoneForState('Vic')).toBe('Australia/Melbourne');
  });

  it('falls back to an Australian clock, never the server', () => {
    // The fallback being Sydney is a considered guess. The fallback being UTC is the defect.
    for (const missing of [null, undefined, '', 'XX']) {
      expect(timeZoneForState(missing)).toBe(DEFAULT_TIME_ZONE);
      expect(timeZoneForState(missing)).toMatch(/^Australia\//);
    }
  });
});

describe('the off-by-one this fixes', () => {
  // 2026-08-04T23:30Z is 07:30 on the 5th in Perth and 09:30 on the 5th in Sydney. Rendered on a
  // UTC server it reads as the 4th — which is exactly what production returned.
  const lateUtc = new Date('2026-08-04T23:30:00Z');

  it('dates a Perth morning as the day it actually was', () => {
    expect(isoDateIn('Australia/Perth', lateUtc)).toBe('2026-08-05');
    expect(longDateIn('Australia/Perth', lateUtc)).toBe('5 August 2026');
  });

  it('is a real difference, not a formatting preference', () => {
    // The assertion that would fail if someone "simplified" this back to toISOString().slice(0,10).
    expect(lateUtc.toISOString().slice(0, 10)).toBe('2026-08-04');
    expect(isoDateIn('Australia/Perth', lateUtc)).not.toBe(lateUtc.toISOString().slice(0, 10));
  });

  it('and works the other way for an east-coast owner', () => {
    // 14:00Z on the 5th is 22:00 on the 5th in Perth but 00:00 on the SIXTH in Sydney.
    const evening = new Date('2026-08-05T14:00:00Z');
    expect(isoDateIn('Australia/Perth', evening)).toBe('2026-08-05');
    expect(isoDateIn('Australia/Sydney', evening)).toBe('2026-08-06');
  });
});

describe('longDateIn', () => {
  it('states a date the way the handover states facts', () => {
    expect(longDateIn('Australia/Perth', '2026-03-03T04:00:00Z')).toBe('3 March 2026');
  });

  it('takes a string or a Date, since entries carry strings and the stamp carries a Date', () => {
    const iso = '2026-03-03T04:00:00Z';
    expect(longDateIn('Australia/Perth', iso)).toBe(longDateIn('Australia/Perth', new Date(iso)));
  });
});
