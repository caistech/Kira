// The owner is told what he is giving away, and the answer he gives actually travels.
//
// This replaces `connect-choices.test.tsx`, which guarded a component that was rendered by nothing.
// Nine assertions passed for weeks over a feature that could not work — so half of this file is
// about CONTENT (what he is told) and half is about WIRING (that his answer reaches Google), because
// the previous version proved the first and the second was false the whole time.
//
// Asserted on source rather than a render, in the style of this repo's other UI guards: these are
// client components with state, and what matters is the content of the offer and the path it takes,
// neither of which a snapshot pins usefully.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const here = (...p: string[]) => path.resolve(__dirname, ...p);
const form = readFileSync(here('DriveConnectForm.tsx'), 'utf8');
const page = readFileSync(here('..', 'app', 'setup', 'drive', 'page.tsx'), 'utf8');
const action = readFileSync(here('..', 'app', 'setup', 'drive', 'actions.ts'), 'utf8');

describe('every option tells him the cost', () => {
  it('has a gain and a cost for all six choices', () => {
    // Three Drive levels, three Gmail levels. A `gain` with no `cost` is the failure this pins:
    // the cost half is the one usually left out, and it is the half he is entitled to.
    expect(form.match(/^\s{4}gain:/gm)?.length).toBe(6);
    expect(form.match(/^\s{4}cost:/gm)?.length).toBe(6);
  });

  it('says out loud that read access means reading everything', () => {
    expect(form).toMatch(/read every file in that Google account/);
    expect(form).toMatch(/She can read your mailbox/);
  });

  it('states the cost of read-only, not only its reassurance', () => {
    // ⚠️ THE ONE THAT WAS MISSING. "She cannot edit, move or delete anything" was written as pure
    // upside on the recommended option. The same fact means a finished handover pack can never be
    // filed back into his Drive, and that was nowhere on the screen.
    expect(form).toMatch(/cannot save a finished document back into your Drive/);
  });

  it('says what she still cannot do, so the limit is visible too', () => {
    // As load-bearing as the warning: an owner who believes drafting means sending grants nothing.
    expect(form).toMatch(/She never sends/);
    expect(form).toMatch(/cannot add, change or delete a contact/);
  });
});

describe('contacts are disclosed, because they are not optional', () => {
  // The defect this file exists for. `scopesFor()` spreads CONTACTS_SCOPES in unconditionally, and
  // there is no interstitial between here and Google — so if this page does not say it, nothing
  // does, and the first he hears of it is Google asking for his address book.
  it('names contacts on the form', () => {
    expect(form).toMatch(/contacts/i);
  });

  it('names the wider half — addresses Google kept from people he has emailed', () => {
    // `contacts.other.readonly` is wider than people assume. Naming only "your contacts" would be
    // technically true and would still surprise him on the Google screen.
    expect(form).toMatch(/addresses Google kept from people you have\s+emailed/);
  });

  it('says it applies whatever he picks above', () => {
    expect(form).toMatch(/Every connection includes your contacts/);
  });

  it('names all three parts on the page itself, above the form', () => {
    // For the owner who reads the header and scrolls no further.
    expect(page).toMatch(/your files/i);
    expect(page).toMatch(/your contacts/i);
    expect(page).toMatch(/your email/i);
  });
});

describe('the defaults grant the least', () => {
  it('defaults Drive to read-only, not full', () => {
    expect(form).toMatch(/options=\{DRIVE\}[\s\S]{0,80}defaultValue="readonly"/);
  });

  it('defaults Gmail to none — a mailbox is never pre-ticked', () => {
    // google-connect.ts makes the same argument on the other side of the seam: omitted means
    // 'none', never "some". An owner who clicks straight through must not meet a Google screen
    // asking for his mail because of a default he did not read.
    expect(form).toMatch(/options=\{GMAIL\}[\s\S]{0,80}defaultValue="none"/);
  });
});

describe('it offers no level the system will not honour', () => {
  it('never offers to send from his address', () => {
    // `gmail.send` is deliberately never requested — outbound goes through the compliant path that
    // carries his identity, the Spam Act footer and the approval gate.
    expect(form).not.toMatch(/send (email|mail|messages) (on your behalf|for you|from your address)/i);
  });

  it('matches the levels the orchestrator accepts', () => {
    for (const level of ['picked', 'readonly', 'full']) {
      expect(form).toMatch(new RegExp(`value: '${level}'`));
    }
    for (const level of ['none', 'draft', 'read']) {
      expect(form).toMatch(new RegExp(`value: '${level}'`));
    }
  });
});

describe('the answer he gives actually travels', () => {
  // ⚠️ THE HALF THE PREVIOUS TEST FILE DID NOT HAVE. Nine passing assertions described a component
  // no page imported, offering levels no caller passed. Content guards cannot see that.
  it('the form is rendered by the page', () => {
    expect(page).toMatch(/import \{ DriveConnectForm \}/);
    expect(page).toMatch(/<DriveConnectForm/);
  });

  it('the action reads the mailbox choice off the form', () => {
    expect(action).toMatch(/formData\.get\('gmail'\)/);
  });

  it('the action passes it to the link that becomes the Google request', () => {
    // Absent means 'none' on the far side, so a link minted without this field is a silent
    // downgrade to no mailbox at all — which is exactly what shipped.
    expect(action).toMatch(/googleConnectLink\(\{[\s\S]{0,400}\bgmail,/);
  });

  it('validates the mailbox level against the same three the type allows', () => {
    expect(action).toMatch(/GMAIL: GmailAccess\[\] = \['none', 'draft', 'read'\]/);
  });
});

describe('it is reachable by a sixty-year-old on a phone', () => {
  it('gives the whole row a 44px target, not just the radio', () => {
    expect(form).toMatch(/min-h-\[44px\]/);
  });

  it('keeps body text at 16px on mobile', () => {
    // text-base is 16px; anything smaller triggers iOS zoom-on-focus and fails the responsive rule.
    expect(form).not.toMatch(/className="[^"]*\btext-xs\b/);
  });
});
