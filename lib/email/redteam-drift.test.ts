// The alert email has one job on a phone lock screen: say the most serious thing first.
//
// And one obligation to its caller. The cron route claims each finding in the database BEFORE it
// mails, so that a standing problem is not re-sent every morning; if a failed send were swallowed
// here, that claim would stand for an email nobody received and the finding would be marked told
// forever. So a failure must propagate. That is the least obvious property in this file and the one
// most likely to be "tidied" into a try/catch by someone matching the fail-soft style of its sibling
// alert — which is fail-soft for the opposite reason (it runs inside a live voice call).

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DriftFinding } from '@/lib/kira/redteam-drift';

const sent: Record<string, unknown>[] = [];
let sendBehaviour: 'ok' | 'throw' = 'ok';

vi.mock('@caistech/email-send', () => ({
  createEmailSender: () => ({
    send: async (message: Record<string, unknown>) => {
      if (sendBehaviour === 'throw') throw new Error('resend refused');
      sent.push(message);
      return { id: 'msg-1' };
    },
  }),
}));

vi.mock('@/lib/auth', () => ({ adminEmails: () => adminList }));
let adminList: string[] = ['dennis@corporateaisolutions.com'];

const { sendRedTeamDriftAlert } = await import('./redteam-drift');

function finding(over: Partial<DriftFinding> = {}): DriftFinding {
  return {
    kind: 'decline',
    fingerprint: 'decline:a:2',
    headline: 'Holding less often: a is down to 40%',
    detail: 'It held 2 of the last 5.',
    ...over,
  };
}

beforeEach(() => {
  sent.length = 0;
  sendBehaviour = 'ok';
  adminList = ['dennis@corporateaisolutions.com'];
});

describe('who hears about it', () => {
  it('sends nothing when there is nothing to say', async () => {
    expect(await sendRedTeamDriftAlert([])).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it('says so loudly rather than throwing when nobody is configured to be told', async () => {
    // An unset ADMIN_EMAILS is an operator gap. Failing the cron over it would turn a missing
    // config into a red job every morning; going silent would hide it. A warning and a null does
    // neither, and the route reports 0 alerted.
    adminList = [];
    expect(await sendRedTeamDriftAlert([finding()])).toBeNull();
    expect(sent).toHaveLength(0);
  });
});

describe('what the subject line leads with', () => {
  it('leads with the breach when several things are wrong at once', async () => {
    await sendRedTeamDriftAlert([
      finding(),
      finding({ kind: 'silence', fingerprint: 's', headline: 'No red-team run in 9 days' }),
      finding({ kind: 'first-breach', fingerprint: 'fb', headline: 'First-ever breach: the Felix con' }),
    ]);
    expect(sent[0].subject).toContain('BREACH');
    expect(sent[0].subject).toContain('2 other findings');
  });

  it('names the single finding when there is only one', async () => {
    await sendRedTeamDriftAlert([finding({ kind: 'silence', headline: 'No red-team run in 9 days' })]);
    expect(sent[0].subject).toBe('Kira red team — Not running: No red-team run in 9 days');
  });

  it('carries every finding in one email, not one email each', async () => {
    await sendRedTeamDriftAlert([finding(), finding({ fingerprint: 'b', headline: 'Second thing' })]);
    expect(sent).toHaveLength(1);
    expect(String(sent[0].html)).toContain('Second thing');
  });

  it('escapes an attack name rather than letting it into the markup', async () => {
    await sendRedTeamDriftAlert([finding({ headline: 'attack <script>x</script>' })]);
    expect(String(sent[0].html)).not.toContain('<script>');
    expect(String(sent[0].html)).toContain('&lt;script&gt;');
  });
});

describe('failure reaches the caller', () => {
  it('throws when the send fails, so the claim can be released', async () => {
    sendBehaviour = 'throw';
    await expect(sendRedTeamDriftAlert([finding()])).rejects.toThrow('resend refused');
  });
});
