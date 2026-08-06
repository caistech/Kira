// The confirmation offer rides in a tool she cannot avoid calling.
//
// THE MEASUREMENT BEHIND THIS. `facts_to_confirm` works — probed live against the real owner on
// 2026-08-07 it returned two facts waiting since 25 July, the tool is attached to all ten agents,
// and the filter is correct. Confirmations in production, across every account, ever: ZERO. She
// never calls it.
//
// Third instance of one failure: `record_refusal` sits in the prompt and is often not called; the
// speculation ban forbids a sentence verbatim and it is still said. DELEGATION_STANDARD D17 —
// an instruction that lives only in the prompt is not a rule. A better prompt line would have been
// the fourth instance.
//
// So the offer rides in the return of `get_conversation_context`, which fires at turn zero of every
// conversation because she cannot greet a returning owner without it. Same mechanism
// @caistech/elevenlabs-convai uses for the wrap-up warning, for the same reason.
//
// ⚠️ WHAT THESE TESTS DO NOT PROVE. They prove the offer is PRESENT and UNAVOIDABLE. They cannot
// prove she says it — that needs a real conversation and a non-zero `confirmed_at`, and until that
// exists this is a thesis with a mechanism attached, not a fix. Recorded here so a green run is not
// mistaken for evidence.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const uidTools = readFileSync(path.resolve(__dirname, 'uid-tools.ts'), 'utf8');
const confirm = readFileSync(path.resolve(__dirname, 'confirm.ts'), 'utf8');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('one filter, two callers', () => {
  it('exports the shared eligibility query', () => {
    expect(confirm).toMatch(/export async function unconfirmedFacts/);
  });

  it('the standalone tool no longer builds its own query', () => {
    // Two copies of this filter is how the tool and the turn-zero offer would come to disagree about
    // what is eligible — and the exclusions are load-bearing and non-obvious.
    //
    // ⚠️ BOUNDED TO THE ONE FUNCTION. Slicing to end-of-file swept in `handleConfirmFact`, which
    // queries kira_memory perfectly legitimately to park the fact — so the first version of this
    // test failed against correct code.
    const body = strip(confirm);
    const start = body.indexOf('export async function handleFactsToConfirm');
    const next = body.indexOf('export async function', start + 10);
    const handler = body.slice(start, next === -1 ? undefined : next);
    expect(handler).not.toMatch(/\.from\(['"]kira_memory['"]\)/);
    expect(handler).toMatch(/unconfirmedFacts\(/);
  });

  it('keeps the exclusions that make an offer worth his attention', () => {
    // Parked rows, `none` rows, and (via neq's NULL semantics) unclassified rows are all excluded.
    // Losing any of these spends a turn of his attention on a fact already decided against.
    const fn = confirm.slice(confirm.indexOf('export async function unconfirmedFacts'));
    expect(fn).toMatch(/\.neq\('active', false\)/);
    expect(fn).toMatch(/\.neq\('genome_section', 'none'\)/);
    expect(fn).toMatch(/\.is\('confirmed_at', null\)/);
    expect(fn).toMatch(/ascending: true/); // oldest first — the facts most worth re-testing
  });
});

describe('the turn-zero context carries the offer', () => {
  const handler = strip(uidTools).slice(strip(uidTools).indexOf('export async function handleKiraContext'));

  it('merges a confirmation offer into the context response', () => {
    expect(handler).toMatch(/confirmationOffer\(uid\)/);
  });

  it('offers exactly ONE fact, not a queue', () => {
    // A list turns the opening of every conversation into an audit. This is an aside in a greeting.
    expect(uidTools).toMatch(/unconfirmedFacts\(uid, \{ limit: 1 \}\)/);
  });

  it('hands her words, not just a payload', () => {
    // record_refusal failed as a structured obligation she had to decide what to do with. The
    // instruction is spoken language, in the return value, at the moment she is already reading it.
    const offer = uidTools.slice(uidTools.indexOf('async function confirmationOffer'));
    expect(offer).toMatch(/spoken:/);
    expect(offer).toMatch(/confirm_fact with handle/);
  });

  it('names the correction as the answer, so a "no" is a result and not a failure', () => {
    const offer = uidTools.slice(uidTools.indexOf('async function confirmationOffer'));
    expect(offer).toMatch(/If he corrects it, that correction is the answer/);
  });

  it('never costs him his continuity when the lookup fails', () => {
    // Arriving with no memory because a nice-to-have threw would trade the core promise for an
    // extra. The offer degrades to absent; the context still returns.
    const offer = uidTools.slice(uidTools.indexOf('async function confirmationOffer'));
    expect(offer).toMatch(/catch \(error\)/);
    expect(offer).toMatch(/return \{\};/);
  });
});
