// lib/valuation/questions.test.ts
//
// The question set is now DATA, which is the point of the extraction: these invariants used to be
// unassertable because the array lived inside a 1,955-line client component and could not be
// imported without a DOM.
//
// ⚠️ WHAT THESE TESTS ARE FOR. Not "does the array have 13 entries" — a count test fails on every
// deliberate change and teaches whoever is adding a question to update the number without reading
// why. They pin the RELATIONSHIPS that a second surface, or a new question, can silently break.

import { describe, expect, it } from 'vitest';

import {
  QUESTION_COUNT,
  RECORD_STEPS,
  SCREEN_COUNT,
  STEPS,
  stepsForStage,
} from './questions';

/** Every answer id the questionnaire can write, group fields hoisted. */
function allAnswerIds(): string[] {
  return STEPS.flatMap((step) => (step.kind === 'group' ? step.fields.map((f) => f.id) : [step.id]));
}

describe('the question set', () => {
  it('never asks for the same answer twice', () => {
    const ids = allAnswerIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every question a record label, including the ones inside a group screen', () => {
    // The result page prints a record of what the number was worked out from (register P9). A
    // question with no label there is a question that silently vanishes from the document — and a
    // group field is the easy one to forget, because it has no screen of its own.
    for (const step of STEPS) {
      if (step.kind === 'group') {
        for (const field of step.fields) {
          expect(field.record.trim(), `group field ${field.id}`).not.toBe('');
        }
      } else {
        expect(step.record.trim(), `step ${step.id}`).not.toBe('');
      }
    }
  });

  it('offers a real choice wherever it asks for one', () => {
    // A single-option "choice" is a question with a predetermined answer. It has never happened;
    // it is the shape a hasty edit produces when options are trimmed rather than the step removed.
    for (const step of STEPS) {
      if (step.kind === 'choice') expect(step.options.length, step.id).toBeGreaterThan(1);
      if (step.kind === 'group') {
        for (const field of step.fields) {
          if (field.kind === 'choice') expect(field.options.length, field.id).toBeGreaterThan(1);
        }
      }
    }
  });

  it('gives every choice option a distinct stored value', () => {
    // The stored value is what reaches the model and the genome baseline. Two options sharing one
    // value is not a display bug — it makes two different answers indistinguishable forever after.
    for (const step of STEPS) {
      const optionSets =
        step.kind === 'choice'
          ? [step.options]
          : step.kind === 'group'
            ? step.fields.filter((f) => f.kind === 'choice').map((f) => (f as { options: { value: string }[] }).options)
            : [];
      for (const options of optionSets) {
        const values = options.map((o) => o.value);
        expect(new Set(values).size, `${step.id} option values`).toBe(values.length);
      }
    }
  });
});

describe('RECORD_STEPS', () => {
  it('covers every question the owner is asked, in order', () => {
    // THE INVARIANT THE RECORD BLOCK EXISTS FOR. It is derived rather than hand-written so it cannot
    // fall behind the questionnaire; this asserts that the derivation actually holds, rather than
    // trusting the flatMap to keep being right when a new step shape is added.
    expect(RECORD_STEPS.map((r) => r.id)).toEqual(allAnswerIds());
  });

  it('carries the options for every choice, so a stored value can be printed as words', () => {
    // Without options the record prints the raw stored value — "i_am_the_business" — on the document
    // an owner is invited to check at arm's length.
    for (const record of RECORD_STEPS) {
      if (record.kind === 'choice') {
        expect(record.options, record.id).toBeDefined();
        expect(record.options!.length, record.id).toBeGreaterThan(0);
      }
    }
  });
});

describe('the two counts', () => {
  it('counts screens and questions separately, because they differ', () => {
    // A group screen holds three questions, so these two numbers are not the same and any surface
    // quoting one has to know which it means. The dashboard's hard-coded "Eleven questions" was
    // true before the debt question and the closing group, and has been wrong since.
    expect(SCREEN_COUNT).toBe(STEPS.length);
    expect(QUESTION_COUNT).toBe(allAnswerIds().length);
    expect(QUESTION_COUNT).toBeGreaterThan(SCREEN_COUNT);
  });
});

describe('stages', () => {
  it('asks the whole current set before signup', () => {
    // Every question that existed at extraction is `baseline`, because the public flow was the only
    // surface. This pins the starting point: if a later change moves one to `genome`, that is a
    // decision to stop asking a cold visitor for it, and it should fail here first.
    expect(stepsForStage('baseline')).toHaveLength(STEPS.length);
    expect(stepsForStage('genome')).toHaveLength(0);
  });

  it('partitions the set — every step belongs to exactly one surface', () => {
    const baseline = stepsForStage('baseline');
    const genome = stepsForStage('genome');
    expect(baseline.length + genome.length).toBe(STEPS.length);
    expect(baseline.some((s) => genome.includes(s))).toBe(false);
  });
});
