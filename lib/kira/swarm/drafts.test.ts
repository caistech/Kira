import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { draftBody, readinessOf } from './drafts';

// THE THREE STATES, AND WHY COLLAPSING THEM WAS THE DEFECT.
//
// Ray asked Kira to write up his pricing. She told him it was "ready to send as a formal note" and
// asked for a recipient's email address — to a man who had told her in the same conversation that
// nobody knows he is selling. There was no document. Both of his tasks carry `preview: null` and
// `artifact: {}`, and the second had come back from the orchestrator REFUSED (`unsupported`) while
// he was being told it was ready.
//
// Everything below is keyed to those real rows.

const RAYS_QUOTE_TASK = {
  status: 'awaiting_approval',
  preview: null,
  artifact: {},
};

const RAYS_REFUSED_TASK = {
  status: 'unsupported',
  preview: null,
  artifact: {},
};

describe('draftBody — never invents a document', () => {
  it('returns null for the real rows that produced this finding', () => {
    expect(draftBody(RAYS_QUOTE_TASK)).toBeNull();
    expect(draftBody(RAYS_REFUSED_TASK)).toBeNull();
  });

  it('returns null for an empty artifact rather than an empty string', () => {
    // An empty string renders as a blank panel that LOOKS like a document, which is the same lie in
    // a quieter voice. Null is what routes the page to the honest "nothing written yet" state.
    expect(draftBody({ artifact: { body: '   ' } })).toBeNull();
    expect(draftBody({ preview: '  ' })).toBeNull();
  });

  it('prefers preview, then the known artifact keys', () => {
    expect(draftBody({ preview: 'the text' })).toBe('the text');
    expect(draftBody({ artifact: { body: 'from body' } })).toBe('from body');
    expect(draftBody({ artifact: { markdown: 'from markdown' } })).toBe('from markdown');
    // preview wins when both are present.
    expect(draftBody({ preview: 'wins', artifact: { body: 'loses' } })).toBe('wins');
  });

  it('ignores a non-string under a known key', () => {
    expect(draftBody({ artifact: { body: { nested: 'object' } } })).toBeNull();
  });
});

describe('readinessOf — a refused task is not a waiting one', () => {
  it("reports Ray's open task as having no body", () => {
    expect(readinessOf(RAYS_QUOTE_TASK)).toBe('no-body');
  });

  it('reports the orchestrator refusal as refused, not as waiting on him', () => {
    // ⚠️ THE ONE THAT COSTS THE MOST. Shown as "drafted and waiting on your go-ahead", a man waits
    // indefinitely on something that was declined hours earlier and never finds out.
    expect(readinessOf(RAYS_REFUSED_TASK)).toBe('refused');
    expect(readinessOf({ status: 'failed', artifact: {} })).toBe('refused');
  });

  it('reports a real body as ready', () => {
    expect(readinessOf({ status: 'awaiting_approval', preview: 'Dear Dave,' })).toBe('ready');
  });
});

describe('the drafts screens do not offer to send', () => {
  // Approving a real email to a real client happens in conversation, where she reads it back and
  // confirms the recipient out loud. A second send path on a screen used at the end of a long day
  // bypasses the confirmation that makes the first one safe — the reading was what was missing, not
  // the sending.
  it.each(['app/drafts/page.tsx', 'app/drafts/[draftId]/page.tsx'])('%s has no send control', (file) => {
    const src = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(src).not.toMatch(/\bSend\b|\bEmail it\b|Approve and send/);
  });

  it('says out loud where sending happens, so the missing button is not read as a missing feature', () => {
    const src = readFileSync('app/drafts/[draftId]/page.tsx', 'utf8');
    expect(src).toContain('Nothing on this page sends anything');
  });
});
