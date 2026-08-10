// A question typed on the public page must survive being asked.
//
// THE DEFECT THIS PINS. `POST /api/kira/ask` wrote NOTHING anywhere — it only sent an operator
// alert. So the email was the entire record, and an alert suppressed by the throttle took a
// visitor's words with it. The same email invites the reader to "See the build queue →", a page
// reading `kira_tasks`, for an item that had never been added to it.
//
// It is the endpoint's own reason for existing, pointed backwards: it was built because the voice
// widget's text fallback swallowed a question silently, and the first thing a tester typed into it
// was "Who else can see what I tell you? My staff don't know I'm selling."
//
// A source assertion rather than a rendered one: the route reaches Supabase and Resend, so running
// it here would test the harness. What can be asserted cheaply is the thing that broke.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const src = readFileSync(path.resolve(__dirname, 'route.ts'), 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the public ask is recorded, not just mailed', () => {
  it('writes a kira_tasks row', () => {
    expect(code).toMatch(/from\('kira_tasks'\)\s*\.insert/);
  });

  it('records it as belonging to nobody, which is what actually happened', () => {
    // NULL is the honest value: asked by a visitor with no account. It also lands correctly under
    // the existing RLS policy (auth.uid() = user_id never matches NULL), so anonymous rows are
    // service-role-only without needing a new policy.
    expect(code).toMatch(/user_id:\s*null/);
  });

  it('records BEFORE it alerts', () => {
    // Ordering is the point. If only one of the two can happen, the durable record is worth more
    // than the notification — a notification can be reconstructed from the row, and not the other
    // way round.
    const insertAt = code.indexOf("from('kira_tasks')");
    const alertAt = code.indexOf('sendUnansweredRequestAlert({');
    expect(insertAt).toBeGreaterThan(-1);
    expect(alertAt).toBeGreaterThan(-1);
    expect(insertAt).toBeLessThan(alertAt);
  });

  it('does not fail the visitor when the write fails', () => {
    // From where he is sitting his question landed. A 500 here reproduces the exact silence this
    // endpoint was built to end.
    const between = code.slice(code.indexOf("from('kira_tasks')"), code.indexOf('sendUnansweredRequestAlert({'));
    expect(between).toMatch(/catch/);
  });

  it('does not file our own CI probe in the build queue', () => {
    // Twenty submissions per gate run would bury a real person's question under our own noise —
    // the same failure as the email flood, in the surface that was supposed to be the fix for it.
    const probeAt = code.indexOf('isAutomatedProbe(question)');
    const insertAt = code.indexOf("from('kira_tasks')");
    expect(probeAt).toBeGreaterThan(-1);
    expect(probeAt).toBeLessThan(insertAt);
  });
});
