// A tool must reach BOTH transports, or it is half-shipped.
//
// WHY THIS TEST EXISTS. `tool-manifest.test.ts` already guards the voice fleet: it fails a prompt
// that names a tool she does not hold, and a tool she holds that the prompt never mentions. It knows
// nothing about the TYPED transport, which resolves its own tool set through a separate hand-written
// map in `text-tools.ts` — `BUILDERS` for the schema and a `switch` in `runTextTool` for the
// execution. `textToolsFor` SKIPS a name it has no builder for (logged, not thrown), so a tool
// registered only in the manifest is silently invisible to anyone typing.
//
// That asymmetry is not hypothetical, and it bites hardest here. The Practice Intelligence
// conversation — float a hypothesis, get pushed back on, agree a question, research it — is far more
// likely to happen by typing than by speaking into a microphone. Voice-only registration would ship
// the feature broken on the transport it is most needed for, and every existing test would pass.
//
// So: three registration points, asserted together. Adding a fourth transport means adding a case
// here rather than hoping someone remembers.

import { describe, expect, it } from 'vitest';

import { toolDefsFor, toolsSection } from './../tool-manifest.mjs';
import { isUidToolUrl, UID_TOOL_NAMES } from './../uid-tools.mjs';
import { textToolsFor } from './../text-tools';

const APP_URL = 'https://example.test';
const TOOL = 'research_organisation';

describe('research_organisation is registered everywhere it has to be', () => {
  it('is attached to the BUSINESS voice agent', () => {
    const names = (toolDefsFor('business', APP_URL) as { name?: string }[]).map((t) => t.name);
    expect(names).toContain(TOOL);
  });

  it('is NOT attached to the personal journey', () => {
    // Commercial research into another organisation has no place in a personal-journey coach's set,
    // and every tool costs attention in the function-calling menu of a small model.
    const names = (toolDefsFor('personal', APP_URL) as { name?: string }[]).map((t) => t.name);
    expect(names).not.toContain(TOOL);
  });

  it('is named to her in the prompt inventory', () => {
    // Generated from the same array, so this cannot drift — asserted anyway, because the whole
    // phantom-tool failure family is "the prompt and the attachment disagreed".
    expect(toolsSection('business', APP_URL)).toContain(TOOL);
  });

  it('carries a server-baked owner (?uid), so its handler can resolve identity', () => {
    // A tool missing from UID_TOOL_NAMES provisions without ?uid and then refuses every call with
    // "No user identity on this request" — a tool that exists, is attached, and can never work.
    expect(UID_TOOL_NAMES).toContain(TOOL);

    const def = (toolDefsFor('business', APP_URL) as Array<{ name?: string; webhook?: { url: string } }>)
      .find((t) => t.name === TOOL);
    expect(def?.webhook?.url).toBeTruthy();
    expect(isUidToolUrl(def!.webhook!.url)).toBe(true);
  });

  it('is offered to the TYPED transport — the registration the voice guard cannot see', () => {
    const tools = textToolsFor([TOOL]);
    const pi = tools.find((t) => t.function.name === TOOL);

    // If this fails, textToolsFor skipped the name: BUILDERS has no entry for it.
    expect(pi, 'research_organisation was skipped by textToolsFor — add it to BUILDERS in text-tools.ts').toBeDefined();
    expect(Object.keys(pi!.function.parameters.properties as object)).toContain('organisation');
  });

  it('every tool the voice fleet holds is ALSO reachable by typing', () => {
    // The general form of the rule, not just this tool. A future tool added to the manifest and
    // forgotten in BUILDERS fails here rather than in a conversation.
    const attached = (toolDefsFor('business', APP_URL) as { name?: string }[])
      .map((t) => t.name)
      .filter((n): n is string => Boolean(n));

    const typed = new Set(textToolsFor(attached).map((t) => t.function.name));
    const missing = attached.filter((n) => !typed.has(n));

    // DELIBERATE. All four are the voice transport's own bookkeeping, which the typed transport
    // already does for itself — text-tools.ts states this in terms: the package's continuity set
    // "stays excluded — those are the transport's own bookkeeping, which it already does."
    // The voice path must pull its history at turn zero; a typed conversation replays its own.
    //
    // `save_message` + `update_conversation_topic` were added to this list after the branch was cut
    // from main and the assertion failed. That failure was correct and worth keeping the note for:
    // the list had been written against a working tree where a sibling change filtered those two out
    // of the manifest, so the test encoded an assumption that was true in one tree and false in the
    // one it would be merged into. A guard written against the wrong baseline passes for the wrong
    // reason.
    const VOICE_ONLY_BY_DESIGN = [
      'get_conversation_context',
      'start_conversation',
      'save_message',
      'update_conversation_topic',
    ];

    // ⚠️ A REAL GAP, NOT A DESIGN DECISION — recorded rather than papered over.
    //
    // `file_manual` is attached to every business voice agent and has a live webhook route at
    // app/api/kira/webhooks/file_manual/route.ts, and the string "file_manual" does not appear
    // anywhere in text-tools.ts. So an owner who TYPES "file that in my Drive" gets told she cannot
    // do it, while the same sentence spoken works. Found 2026-08-13 by this assertion; it predates
    // Practice Intelligence and is untouched by it.
    //
    // Deliberately listed here instead of being quietly added to the line above, because the two
    // mean opposite things and an allowlist that mixes them stops being evidence of anything. It is
    // also not fixed here: file_manual WRITES into the owner's own document storage, and wiring a
    // write path into a second transport is a decision with its own consequences, not a drive-by.
    // Fixing it is deleting one line from this array.
    const KNOWN_UNFIXED_GAPS = ['file_manual'];

    expect(
      missing.filter((n) => !VOICE_ONLY_BY_DESIGN.includes(n) && !KNOWN_UNFIXED_GAPS.includes(n)),
    ).toEqual([]);
  });
});
