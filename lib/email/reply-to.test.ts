// Every email Kira sends must offer a way back to a human.
//
// She sends FROM `noreply@updates.corporateaisolutions.com` — the only Resend-verified subdomain,
// and not changeable without a paid plan. So the From address genuinely cannot receive a reply, and
// for a long time nothing set Reply-To, which meant an owner who answered an email was answering
// nothing: bounce or silence, with no way for him to tell which.
//
// That is not an edge case for THIS buyer. He is sixty-something, he replies to email rather than
// clicking through, and "yes, go ahead" is exactly what he sends. Losing it is worse than losing a
// click, because he believes he has answered and waits.
//
// This asserts the property across the whole directory rather than on the six files that had the
// bug, because the failure mode is the SEVENTH send site — added later, by someone who never read
// this comment.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const DIR = 'lib/email';

/** Files in lib/email that actually dispatch mail. */
function sendingFiles(): string[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .filter((f) => /\.send\(\{/.test(readFileSync(join(DIR, f), 'utf8')));
}

describe('every send site sets a reply path', () => {
  it('finds the send sites at all (guards against a vacuous pass)', () => {
    // If a refactor moves sending elsewhere, this test would otherwise silently assert nothing.
    expect(sendingFiles().length).toBeGreaterThanOrEqual(6);
  });

  it.each(sendingFiles())('%s passes replyTo', (file) => {
    const src = readFileSync(join(DIR, file), 'utf8');
    const sends = src.match(/\.send\(\{/g)?.length ?? 0;
    const replies = src.match(/replyTo:/g)?.length ?? 0;
    // One per send call — a file with two sends and one replyTo has a silent gap.
    expect(replies).toBeGreaterThanOrEqual(sends);
  });

  it('routes replies to the identified sender, not a second hardcoded address', () => {
    // The reply address is EMAIL_SENDER_EMAIL — the same reply-capable contact already named in the
    // Spam Act identification footer. A literal pasted at a send site is how the footer and the
    // reply path drift apart, and only one of them is legally load-bearing.
    for (const file of sendingFiles()) {
      const src = readFileSync(join(DIR, file), 'utf8');
      expect(src).toMatch(/replyTo: replyToAddress\(\)/);
      expect(src).not.toMatch(/replyTo: ['"`]/);
    }
  });
});

describe('the From address stays on the verified subdomain', () => {
  it('never sends from the bare apex', () => {
    // `corporateaisolutions.com` is NOT verified in Resend; only `updates.corporateaisolutions.com`
    // is. Sending from the apex fails at the provider, which is how Kira sent every transactional
    // email to nowhere for months. The apex is fine as a REPLY target — it receives mail, it just
    // cannot originate it.
    for (const file of sendingFiles()) {
      const src = readFileSync(join(DIR, file), 'utf8');
      const froms = src.match(/from:\s*['"`][^'"`]*['"`]/g) ?? [];
      for (const f of froms) {
        expect(f).not.toMatch(/@corporateaisolutions\.com/);
      }
    }
  });
});
