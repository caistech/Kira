// The "she is still filing" notice — pinned against the two ways it silently dies.
//
// Ray walked from a good conversation straight to this page and read nine empty bars under a
// sentence saying that was expected before his first conversation. He concluded for twenty minutes
// that the product did not work. The notice exists to convert that into a wait.
//
// It is tested at the SOURCE rather than by rendering, because both failure modes are things a
// render test would happily pass over: a column nobody writes, and a prop that is computed and then
// not handed to the component.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const page = readFileSync(join(process.cwd(), 'app/my-genome/page.tsx'), 'utf8');
const buckets = readFileSync(join(process.cwd(), 'components/GenomeBuckets.tsx'), 'utf8');

describe('still-filing notice', () => {
  it('keys the freshness check on a column something actually writes', () => {
    // ⚠️ THE ORIGINAL BUG, PINNED. `conversations.ended_at` is in the schema and no code path in
    // this repo sets it, so a check reading it is true exactly never — it typechecks, it builds,
    // and the finding it claims to fix stays live. `started_at` has a NOW() default.
    const check = page.slice(page.indexOf('FILING_WINDOW_MS'), page.indexOf('const justTalked') + 400);
    expect(check).toContain('started_at');
    expect(check).not.toContain('ended_at');
  });

  it('hands the computed flag to the component', () => {
    // Computing justTalked and forgetting to pass it is the "correct, tested and unreachable"
    // shape: every assertion above still passes and the owner sees nothing.
    expect(page).toMatch(/stillFiling=\{justTalked\}/);
  });

  it('renders the notice only when the flag is set', () => {
    expect(buckets).toMatch(/\{stillFiling && \(/);
    expect(buckets).toContain('still writing up your last conversation');
  });

  it('puts the notice above the summary counts, not after them', () => {
    // He needs the reason before he reads the numbers. Below them it is an explanation for a
    // conclusion he has already drawn.
    const notice = buckets.indexOf('{stillFiling && (');
    const counts = buckets.indexOf('Nothing is captured yet');
    expect(notice).toBeGreaterThan(-1);
    expect(counts).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(counts);
  });
});
