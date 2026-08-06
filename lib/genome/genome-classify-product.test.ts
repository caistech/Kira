// A customer whose product IS an AI assistant must still get a Genome.
//
// THE DEFECT THIS PINS, measured on production 2026-08-07. Of 10 rows captured for
// shhahhussain@gmail.com since the 08-04 distiller fix, SEVEN were filed `about=assistant` by the
// classifier with no `assistant-state` tag from the distiller. What they contained was his company:
//
//     "Minimo is a mini memory infrastructure designed for AI agents and humans within the business."
//     "The long memory evaluation benchmark for retrieval is 99.2%, the highest in the world..."
//     "Shah created Minimo, a memory infrastructure for the AI agent and human."
//
// `about=assistant` forces `section='none'`, so his product, his headline metric and his founding
// fact are all withheld from his own Genome. He has three visible entries. He is evaluating this
// product for a partnership.
//
// CAUSE: the classifier prompt opened "START BY TRYING TO SAY assistant" — a bias added because the
// assistant→none guard was measured leaking zero rows. Tuning a guard for its false-negative rate is
// what produced the false-positive one. The prompt's own test ("would this still be true if this
// assistant had never existed?") exonerated all seven and was overridden by the bias whenever the
// vocabulary looked AI-shaped.
//
// WHY THIS IS A SOURCE ASSERTION. The classification is one LLM call; asserting its output here
// would be a live model test, non-deterministic, and would fail for reasons unrelated to the rule.
// What can be pinned cheaply is the RULE the prompt states — the bias is gone, the test is present,
// and the worked examples that name the failure are there for the model to follow. The behavioural
// half belongs in the golden-corpus eval (T9), scored as a rate, and is owed.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(path.resolve(__dirname, 'derive.ts'), 'utf8');

/**
 * The classifier system prompt, isolated so header comments cannot satisfy these assertions.
 *
 * ⚠️ SCANNED BY LINE, NOT BY REGEX. The obvious extractor — /const CLASSIFY_SYSTEM = `([\s\S]*?)`;/ —
 * fails against correct code: the prompt body contains 26 backticks of its own, so the non-greedy
 * match terminates on the first one and returns almost nothing. That produced five red tests against
 * a fix that was already in place, which is the worst kind of guard: one that cries wolf and gets
 * deleted. Take lines from the declaration to the closing fence instead.
 */
function classifyPrompt(): string {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('const CLASSIFY_SYSTEM = `'));
  if (start === -1) throw new Error('CLASSIFY_SYSTEM declaration not found in derive.ts');
  // Any line BEGINNING with the fence closes it — the declaration currently ends `.trim();, and
  // pinning the exact suffix is how this extractor failed twice before landing.
  const end = lines.findIndex((l, i) => i > start && l.startsWith('`'));
  if (end === -1) throw new Error('CLASSIFY_SYSTEM closing fence not found in derive.ts');
  return lines.slice(start + 1, end).join('\n');
}

describe('the classifier prompt', () => {
  it('does NOT bias toward answering "assistant"', () => {
    // The exact line that cost Shah seven facts. It read:
    //   ANSWER "about" FIRST, and START BY TRYING TO SAY "assistant".
    const prompt = classifyPrompt();
    expect(prompt).not.toMatch(/START BY TRYING TO SAY/i);
    expect(prompt).not.toMatch(/try(ing)? to say ["']?assistant/i);
  });

  it('states the owner-product rule explicitly, because the general test was not enough', () => {
    // The discriminator was already present and was overridden. Naming the case directly is what
    // stops a model reaching for the vocabulary instead of the subject.
    const prompt = classifyPrompt();
    expect(prompt).toMatch(/OWN PRODUCT IS ALWAYS "business"/i);
    expect(prompt).toMatch(/AI assistant, an agent|agent, a memory system/i);
  });

  it('keeps the would-this-be-true-without-the-assistant test as the deciding rule', () => {
    const prompt = classifyPrompt();
    expect(prompt).toMatch(/would this still be true if this assistant had never existed/i);
  });

  it('warns that AI vocabulary proves nothing', () => {
    // "agent", "memory", "retrieval" are ordinary nouns in a technology business. This is the
    // sentence that generalises past Shah to every future technical customer.
    expect(classifyPrompt()).toMatch(/prove nothing|proves nothing/i);
  });

  it("carries Shah's real sentences as worked examples", () => {
    // Real production data, not invented fixtures — the model is shown the exact shape that failed.
    const prompt = classifyPrompt();
    expect(prompt).toContain('Minimo');
    expect(prompt).toMatch(/99\.2%/);
  });
});

describe('the distiller tag remains authoritative', () => {
  it('is still imported rather than restated', () => {
    // 18 rows carrying assistant-state from the distiller were all correct; the model's unaided
    // verdicts produced the seven failures. The producing side knows; the classifier guesses.
    expect(source).toContain("import { ASSISTANT_STATE_TAG } from '@/lib/kira/memory-extract'");
  });
});
