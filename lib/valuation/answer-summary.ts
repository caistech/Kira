// lib/valuation/answer-summary.ts
//
// WHAT THE NUMBER WAS WORKED OUT FROM — the block that turns the result page into a document.
//
// "If I print this and put it in a drawer, in six months I won't know what turnover figure it was
// based on or when I ran it." (Register P9.) The result page is the one surface in the product that
// LEAVES THE BUILDING — it carries "Print or save as PDF" and is explicitly built to be handed to an
// accountant — and it printed three figures and an essay with no record of the inputs that produced
// them. A page that cannot be reconciled six months later is a screenshot, not a document.
//
// WHY THIS IS A MODULE RATHER THAN MARKUP. The invariant worth holding is not "there is a block on
// the page"; it is "EVERY question that was asked appears on the record". Those are different
// claims, and only the second one survives a thirteenth question being added — which has happened
// twice in a fortnight (the debt question, then the three below it). Derived from the SAME `STEPS`
// array the questionnaire renders, so a question cannot exist without appearing here, and `record`
// is a REQUIRED field on the step type so a new question cannot be added without deciding what it is
// called on the document. A block hand-written in JSX would have gone stale on the next question and
// nothing would have said so.
//
// ⚠️ IT MUST NOT RE-DERIVE ANYTHING. Every value here is what the owner typed or picked, formatted.
// The moment this file computes something it becomes a second opinion about the valuation, and one
// figure with two values is the defect `displayed.ts` exists to end.

/** The shape this needs from a questionnaire step. `STEPS` in the page satisfies it structurally. */
export interface SummaryStep {
  id: string;
  kind: 'industry' | 'money' | 'choice';
  /**
   * The step's label ON THE DOCUMENT — a short noun phrase, not the question.
   *
   * REQUIRED, so TypeScript refuses a new question that has not decided what it is called here. The
   * question titles are conversational by design ("If you took a 3-month holiday tomorrow, what
   * happens?") and a record built from them reads as a transcript rather than a summary.
   */
  record: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export interface SummaryRow {
  label: string;
  value: string;
}

/**
 * What is printed when a question was skipped or never reached.
 *
 * NEVER a blank, a dash or a zero. The debt question is explicitly skippable ("leave it blank if you
 * would rather not say"), and on a document handed to an accountant an empty cell is ambiguous
 * between "he said nothing" and "he said none" — which for debt is the difference between an unknown
 * and a claim. Zero is a real answer to the gear question and must stay distinguishable from this.
 */
export const NOT_GIVEN = 'Not given';

/**
 * Every question asked, with the answer given, in the order they were asked.
 *
 * `money` is injected rather than imported so this module never has an opinion about currency, and
 * so a test can assert the ROWS without asserting a format.
 */
export function summariseAnswers(
  steps: ReadonlyArray<SummaryStep>,
  answers: Readonly<Record<string, unknown>>,
  options: {
    money: (n: number) => string;
    /** What he actually typed at the industry question, when it differs from the sector matched. */
    typedSector?: string;
  },
): SummaryRow[] {
  return steps.map((step) => {
    const raw = answers[step.id];

    if (step.kind === 'money') {
      // ZERO IS AN ANSWER, and `Number.isFinite` is what keeps it one. "A ballpark is fine; enter 0
      // if little applies" is printed under the gear question, so an owner who answers honestly with
      // nothing must not have it recorded as though he refused.
      const n = typeof raw === 'number' ? raw : Number.NaN;
      return { label: step.record, value: Number.isFinite(n) ? options.money(n) : NOT_GIVEN };
    }

    if (step.kind === 'choice') {
      const chosen = step.options?.find((o) => o.value === raw);
      return { label: step.record, value: chosen ? chosen.label : NOT_GIVEN };
    }

    // Industry. The matched SECTOR is the load-bearing value — it sets the multiple — so it leads,
    // and what he typed is carried beside it when the two differ. Six months later "Electrical
    // Contractors — from 'sparky'" is the line that lets him tell a correct match from a lucky one.
    const sector = typeof raw === 'string' ? raw.trim() : '';
    if (!sector) return { label: step.record, value: NOT_GIVEN };
    const typed = options.typedSector?.trim();
    const differs = Boolean(typed) && typed!.toLowerCase() !== sector.toLowerCase();
    return { label: step.record, value: differs ? `${sector} — from “${typed}”` : sector };
  });
}

/**
 * The date the valuation was run, in the form an Australian owner writes on a document.
 *
 * "9 August 2026" rather than a slashed numeric date, because 8/9/26 means two different days
 * depending on which side of the Pacific reads it, and this page is built to be handed to somebody
 * else. Takes the date rather than calling `new Date()` so the caller owns the clock and a test can
 * pin it.
 */
export function formatRunDate(when: Date): string {
  return when.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}
