// The typed transport gained tools. These pin the three properties that make that safe rather than
// merely useful — each one is a way the second transport could quietly stop enforcing what the
// first one does.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => ({
  dispatched: [] as Array<{ url: string; body: Record<string, unknown> }>,
  throwOnSearch: false,
}));

vi.mock('@/lib/kira/swarm/tool-handlers', () => ({
  handleDispatchTask: async (req: Request) => {
    handlers.dispatched.push({ url: req.url, body: await req.json() });
    return new Response(JSON.stringify({ success: true, status: 'awaiting_approval' }), {
      headers: { 'content-type': 'application/json' },
    });
  },
  handleApproveTask: async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
  handleCheckTasks: async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
}));

vi.mock('./lookup', () => ({
  searchDrive: async () => {
    if (handlers.throwOnSearch) throw new Error('drive exploded');
    return { ok: true, results: [] };
  },
  lookUpContact: async () => ({ ok: true, results: [] }),
}));

const { claimsWorkState, runTextTool, textToolsFor } = await import('./text-tools');

beforeEach(() => {
  handlers.dispatched.length = 0;
  handlers.throwOnSearch = false;
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('the tool schemas are PROJECTED, never retyped', () => {
  // The single most important property here. Those descriptions are not documentation — they are
  // where the consent rule and the honesty rule are actually enforced, because they are what the
  // model reads at decision time. A hand-written second copy for the typed transport is how one
  // transport keeps asking before it files and the other silently stops.
  it('carries the keep_document consent rule verbatim onto the typed transport', () => {
    const keep = textToolsFor(['keep_document'])[0]!;
    expect(keep.function.description).toContain('ONLY after you have offered');
    expect(keep.function.description).toContain('NEVER call it unprompted');
  });

  it('carries the ok:false honesty rule onto the typed transport', () => {
    const drive = textToolsFor(['search_drive'])[0]!;
    expect(drive.function.description).toContain('ok=false');
    expect(drive.function.description).toMatch(/do not describe it as nothing being found/i);
  });

  it('keeps the parameter contract (file_id from a previous search, not a name)', () => {
    const read = textToolsFor(['read_document'])[0]!;
    expect(read.function.parameters.required).toContain('file_id');
    // Asserted by CONTAINMENT rather than equality, because the disclosure gate adds `speaking_to`
    // to every tool on that surface and an exact-array assertion would fail the moment a shared
    // guard is applied — punishing exactly the change that is supposed to be applied uniformly.
    // The property under test is that the id comes from a previous search, not that this is the
    // only parameter.
    expect(read.function.parameters.required).toContain('speaking_to');
    expect(Object.keys(read.function.parameters.properties as Record<string, unknown>)).toContain('file_id');
  });
});

describe('the exposed set', () => {
  it('offers only tools it can actually run', () => {
    const names = textToolsFor(['dispatch_task', 'search_drive', 'not_a_real_tool']).map((t) => t.function.name);
    expect(names).toEqual(['dispatch_task', 'search_drive']);
  });

  it('skips lifecycle tools silently — the transport performs those itself', () => {
    expect(textToolsFor(['save_message', 'start_conversation', 'update_conversation_topic'])).toHaveLength(0);
    expect(console.warn).not.toHaveBeenCalled();
  });

  // Her prompt names both of these four times, including "Capture as you go … (save_memory)".
  // Offering the instructions without the tool is what invites her to narrate a note she never took.
  it('offers the memory tools her prompt already promises', () => {
    const names = textToolsFor(['recall_memory', 'save_memory']).map((t) => t.function.name);
    expect(names).toEqual(['recall_memory', 'save_memory']);
  });

  it('takes the memory schemas from the package, not a local retype', () => {
    // If the package renames or drops them, this throws rather than silently offering nothing —
    // the failure mode being avoided is a tool quietly disappearing from one transport only.
    expect(() => textToolsFor(['recall_memory'])).not.toThrow();
    expect(textToolsFor(['save_memory'])[0]!.function.parameters).toBeTypeOf('object');
  });

  it('warns when the fleet has a tool this registry does not — a silent skip hides a gap', () => {
    textToolsFor(['some_new_tool']);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('some_new_tool'));
  });
});

describe('identity belongs to the route, not the model', () => {
  it('bakes the owner into the request and ignores a model-supplied user_id', async () => {
    await runTextTool('dispatch_task', { request: 'send it', user_id: 'victim', uid: 'victim' }, 'real-owner');

    expect(handlers.dispatched).toHaveLength(1);
    // The identity the handler will read is the query param — the body ids ride along and are ignored.
    expect(handlers.dispatched[0]!.url).toContain('uid=real-owner');
    expect(handlers.dispatched[0]!.url).not.toContain('victim');
  });
});

describe('claims about work she has not checked', () => {
  // The sentence this exists for, verbatim from a red-team transcript. Nothing had been sent; the
  // owner had asserted a false approval and she handed it back as probable fact.
  it('catches the hedged claim that was actually observed', () => {
    expect(claimsWorkState("It looks like it's already been sent to Dave.")).toBe(true);
    expect(claimsWorkState('It looks like everything is already done on that.')).toBe(true);
    expect(claimsWorkState('That may have gone out earlier today.')).toBe(true);
  });

  it('catches the flat assertion too — a confident false claim is not the safer one', () => {
    expect(claimsWorkState('That quote has been sent.')).toBe(true);
    expect(claimsWorkState('The Marlow Street quote was emailed to Bexley Structural.')).toBe(true);
    expect(claimsWorkState("It's all been actioned.")).toBe(true);
    expect(claimsWorkState("I've dealt with that one.")).toBe(true);
  });

  // An unchecked denial is the same defect wearing a safer face: if a task is sitting dispatched she
  // has just told him the opposite of the truth, and the ledger makes the denial stronger anyway.
  it('catches the negative claim as well as the positive', () => {
    expect(claimsWorkState('Nothing has been sent.')).toBe(true);
  });

  it('leaves offers, questions and conditionals alone', () => {
    expect(claimsWorkState('Shall I send that to Dave now?')).toBe(false);
    expect(claimsWorkState("I'll send it as soon as you approve it.")).toBe(false);
    expect(claimsWorkState('Do you want me to send the quote?')).toBe(false);
    expect(claimsWorkState('I can send that once you have approved it.')).toBe(false);
    // A capability statement, not a claim about what happened.
    expect(claimsWorkState("I can't send anything you haven't approved on this call.")).toBe(false);
  });

  it('leaves her ordinary conversation alone', () => {
    expect(claimsWorkState('Tell me a bit about how you price a job.')).toBe(false);
    expect(claimsWorkState("I've noted that down against your pricing.")).toBe(false);
    expect(claimsWorkState('That sounds like the sort of thing a buyer would ask about.')).toBe(false);
  });

  // A reply routinely contains both shapes. Judging the whole blob at once would let the offer mask
  // the claim, which is precisely the reply she produces when pushed: a hedge, then a helpful offer.
  it('judges sentence by sentence, so an offer cannot mask a claim', () => {
    expect(claimsWorkState("It looks like that's already gone out. Shall I check anything else?")).toBe(true);
    expect(claimsWorkState('Nothing is waiting on you. Would you like me to draft it?')).toBe(false);
  });
});

describe('a broken tool degrades honestly', () => {
  // The tool descriptions instruct her to read `message` verbatim when ok is false. A thrown error
  // must therefore arrive in that shape — otherwise the one path she has no instructions for is the
  // one where something actually went wrong, and she is free to narrate it as "nothing found".
  it('returns ok:false with a speakable message instead of throwing', async () => {
    handlers.throwOnSearch = true;
    const result = (await runTextTool('search_drive', { query: 'Lot 91' }, 'owner')) as {
      ok: boolean;
      message: string;
    };

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/couldn't do that just now/i);
    expect(result.message).not.toMatch(/exploded/); // never the raw error
  });

  it('refuses an unknown tool in the same honest shape', async () => {
    const result = (await runTextTool('delete_everything', {}, 'owner')) as { ok: boolean; message: string };
    expect(result.ok).toBe(false);
  });
});
