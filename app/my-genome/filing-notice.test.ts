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
    //
    // Anchored on the two places that can carry the mistake — the helper and the query — rather
    // than on one wide slice between them. The clock read moved OUT of the component on 2026-08-18
    // (react-hooks/purity), which stretched that slice across most of the render body; an assertion
    // spanning code it was never about passes for reasons that have nothing to do with the bug.
    const helper = page.slice(page.indexOf('const FILING_WINDOW_MS'), page.indexOf('// The owner\'s OWN Genome'));
    expect(helper).toContain('startedAt');
    expect(helper).not.toContain('ended_at');

    const query = page.slice(page.indexOf("from('conversations')"), page.indexOf('const justTalked'));
    expect(query).toContain("select('started_at')");
    expect(query).not.toContain('ended_at');
  });

  it('reads the clock outside the component, so the notice cannot go stale under memoisation', () => {
    // Date.now() in a render body is a lint error AND a real staleness bug once the page is
    // memoised. It sat in the render body from 2026-08-16 and was the single error that took the
    // whole portfolio-gate run red — with Tests, the chrome check, voice-reachability,
    // design-tokens and Build all downstream of it and therefore unrun for two days.
    const body = page.slice(page.indexOf('export default async function MyGenome'));
    expect(body).not.toContain('Date.now()');
    expect(page.slice(0, page.indexOf('export default async function MyGenome'))).toContain('Date.now()');
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
