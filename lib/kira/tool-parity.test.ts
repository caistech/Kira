// The two tool lists must name the same tools.
//
// There are two provisioning paths, and they are twins that have drifted twice:
//
//   kiraAllTools()      lib/kira/convai.ts        — TS. New agents, and lib/admin/exec-reprovision.
//   toolDefsFor()       lib/kira/tool-manifest.mjs — .mjs. scripts/reprovision + the red team.
//
// setAgentTools REPLACES an agent's tool list, so whichever path runs LAST decides what the fleet
// holds. A tool missing from one twin is not "skipped" — it is REMOVED from every agent that path
// touches, silently, and the agent then tells its owner it cannot do the thing.
//
// This has now happened twice. The first time it stripped dispatch_task and approve_task off ten
// live agents. The second time was 2026-08-04, by me: exec-reprovision ran kiraAllTools while the
// new recall_memory trigger and the confirmation pair lived only in the manifest, so the fleet came
// back with 15 tools instead of 17 and without the trigger the whole exercise was for.
//
// The existing control was a comment reading "change one, change both". This is that comment with
// teeth.

import { beforeAll, describe, expect, it } from 'vitest';
import { kiraAllTools } from './convai';
import { toolDefsFor } from './tool-manifest.mjs';

const APP = 'https://example.test';

// A DUMMY SECRET, SET HERE RATHER THAN SKIPPING, AND RATHER THAN IN CI CONFIG.
//
// `kiraAllTools` calls `requireToolSecret`, which THROWS when the secret is unset — correct, and
// deliberately fail-closed: the tool webhooks resolve identity from a public agent id, so serving
// them unauthenticated would expose every user's memory. That guard is not being weakened.
//
// But this test is about TOOL PARITY, not about authentication. It only needs the call to return a
// list. On a machine with a .env.local the real value satisfied it and the test passed; in CI it
// threw, so the check that exists because the fleet was silently stripped to 15 tools TWICE was the
// one thing not protecting the fleet.
//
// Skipping without a secret would have been the easy fix and the wrong one — it would leave this
// green and unrun everywhere it matters most. Setting it in the workflow instead would fix CI and
// leave a fresh clone broken. Set here, scoped to this file, so the invariant is checked wherever
// the suite runs. `lib/kira/tool-secret.test.ts` owns the "unset must throw" behaviour and manages
// its own env, so nothing here can mask it.
// Falsy rather than nullish (`??=`), matching `requireToolSecret`'s own `if (!secret)`. An empty
// string is a real state — it is what a declared-but-blank env var gives you — and `??=` would leave
// it in place and throw exactly as before.
beforeAll(() => {
  if (!process.env.KIRA_TOOL_WEBHOOK_SECRET && !process.env.CONVAI_TOOL_SECRET) {
    process.env.KIRA_TOOL_WEBHOOK_SECRET = 'test-tool-secret-not-a-real-credential';
  }
});

const names = (tools: Array<{ name?: string }>): string[] =>
  tools.map((t) => t.name).filter((n): n is string => Boolean(n)).sort();

describe('the two provisioning paths agree', () => {
  it('name exactly the same tools', () => {
    const ts = names(kiraAllTools(APP, 'user-1') as Array<{ name?: string }>);
    const mjs = names(toolDefsFor('business', APP) as Array<{ name?: string }>);
    expect(ts).toEqual(mjs);
  });

  it('carry the same recall_memory trigger', () => {
    // The description is what makes her CALL it. A trigger present on one path and absent on the
    // other means the fix lands or does not depending on which script ran last.
    const find = (tools: Array<{ name?: string; description?: string }>) =>
      tools.find((t) => t.name === 'recall_memory')?.description ?? '';
    const ts = find(kiraAllTools(APP, 'user-1') as Array<{ name?: string; description?: string }>);
    const mjs = find(toolDefsFor('business', APP) as Array<{ name?: string; description?: string }>);
    expect(ts).toMatch(/whenever the owner refers to/i);
    expect(ts).toBe(mjs);
  });
});
