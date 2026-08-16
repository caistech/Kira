// lib/valuation/questions.ts
//
// THE QUESTION SET — one definition, rendered on more than one surface.
//
// WHY THIS FILE EXISTS. `STEPS` was declared inline inside `app/business-valuation/page.tsx`, a
// 1,955-line client component. There was exactly one definition, which was right, but it could not
// be read from anywhere else — so rendering the same questions inside the portal meant forking that
// page, and from then on every new question would have to be added twice, correctly, forever. The
// public flow and the in-portal gate have to ask the SAME questions or the two genomes diverge, and
// a rule that says "remember to edit both" is not a mechanism.
//
// ⚠️ NO JSX IN THIS FILE, and that is the constraint that makes it worth extracting rather than just
// moving. The icons were `React.ReactNode` (`<Building2 className="h-6 w-6" />`), which forces every
// importer to be a client component and drags `lucide-react` in with it. A server component that
// only wants to know WHICH QUESTIONS EXIST — the dashboard gate deciding whether a baseline is
// complete, a test asserting coverage of the nine genome areas — cannot pay that. So an icon is a
// KEY here and the renderer owns the mapping to a node. The question set is data; the drawing of it
// is not.
//
// WHAT IS DELIBERATELY NOT HERE. The wizard itself — resume-from-sessionStorage, the industry
// autocomplete, validation, the result page — stays in the page for now. That component is ~700
// lines of stateful UI and the file's own comments record it as the best-reviewed thing on the site;
// moving the data and the behaviour in one change would make neither reviewable. Data first, proven
// by tests; the shared renderer is the next step, not this one.
//
// NOTHING RENDERS DIFFERENTLY AS A RESULT OF THIS FILE. Every question, every option value, every
// word of help text and every comment below is the one that was already live. The only changes are
// the icon representation and the addition of `stage`.

import { SDE_DEFINITION } from './sde-copy';
import { EXIT_TIMEFRAME_OPTIONS } from './exit-timing';
import type { ValuationInputs } from './model';
import type { ExitTimeframe } from './exit-timing';
import type { SummaryStep } from './answer-summary';

/**
 * The answers held on the device.
 *
 * WIDER THAN `ValuationInputs` BY EXACTLY ONE FIELD, and the widening is the H3 guard's structural
 * half. `exitTimeframe` is asked, shown back, and never travels: it is not an input to the model and
 * it is not part of the payload that becomes a row on his account at signup. Keeping it out of
 * `ValuationInputs` means it cannot arrive there by being passed along with everything else — see
 * `forSharing` in lib/valuation/share.ts, and the reasoning in lib/valuation/exit-timing.ts.
 */
export type Answers = Partial<ValuationInputs> & { exitTimeframe?: ExitTimeframe };

/** Any answer key the questionnaire can write, including the device-only one. */
export type AnswerKey = keyof ValuationInputs | 'exitTimeframe';

export interface ChoiceOption {
  value: string;
  label: string;
  sub?: string;
}

/**
 * Which surface asks this question.
 *
 * `baseline` — the public, pre-signup flow. These produce the valuation, so the set is bounded by
 *   what a cold visitor will answer before he trusts us with anything. Every question that existed
 *   when this file was extracted is `baseline`, because that was the only surface.
 *
 * `genome` — asked inside the portal, after the gate. These fill a genome area without entering the
 *   valuation arithmetic, so they cost no `MODEL_VERSION` bump and no rescore. They exist so the
 *   question set can grow past what is reasonable to put in front of a stranger.
 *
 * ⚠️ THE STAGE IS NOT A STATEMENT ABOUT IMPORTANCE. It is a statement about WHERE IT IS SAFE TO ASK.
 * Promoting a `genome` question to `baseline` is free; wiring one into the model is not — that is a
 * `MODEL_VERSION` bump and a rescore of every stored baseline, whichever stage it sits in.
 */
export type QuestionStage = 'baseline' | 'genome';

/**
 * The icon a step shows, as a KEY rather than a node.
 *
 * The renderer maps these to components. Keys are the lucide component names, lower-cased, so the
 * mapping is mechanical and a missing entry is obvious at the call site rather than being a silently
 * absent glyph.
 */
export type IconKey =
  | 'building-2'
  | 'trending-up'
  | 'users'
  | 'user-cog'
  | 'file-stack'
  | 'repeat'
  | 'wrench'
  | 'landmark'
  | 'clock';

/**
 * A questionnaire step.
 *
 * `record` IS REQUIRED ON EVERY VARIANT, and that is the mechanism rather than a convention. The
 * result page prints a record of what the number was worked out from (register P9), derived from
 * this array — so a question cannot be added without deciding what it is called on that document,
 * and the record cannot silently fall behind the questionnaire. A block hand-written in JSX would
 * have gone stale at the next question with nothing to say so; this fails to compile.
 *
 * `group` renders SEVERAL short questions on ONE screen. It exists because the thing Ray asked for
 * was literally "one more screen" — and the three-minute, no-signup, one-question-at-a-time shape is
 * the best-reviewed thing on the site, with the count quoted on the intro button. Three more steps
 * would have taken 12 questions to 15; one group step takes 12 screens to 13.
 */
export type Step =
  | {
      id: keyof ValuationInputs;
      kind: 'industry';
      icon: IconKey;
      title: string;
      help: string;
      record: string;
      stage: QuestionStage;
    }
  | {
      id: keyof ValuationInputs;
      kind: 'money';
      icon: IconKey;
      title: string;
      help: string;
      placeholder: string;
      record: string;
      stage: QuestionStage;
      /**
       * Next stays enabled with the field empty.
       *
       * ⚠️ THIS WAS A LIVE DEFECT, found while adding the record block. The debt question's help says
       * "Leave it blank if you would rather not say — everything else still works", and `canAdvance`
       * disabled Next until a number was typed. The copy promised something the button refused, on
       * the one question an owner is most likely to decline, in a product whose entire proposition is
       * that it does not push.
       */
      optional?: boolean;
    }
  | {
      id: keyof ValuationInputs;
      kind: 'choice';
      icon: IconKey;
      title: string;
      help: string;
      options: ChoiceOption[];
      record: string;
      stage: QuestionStage;
    }
  | {
      id: 'closing';
      kind: 'group';
      icon: IconKey;
      title: string;
      help: string;
      fields: GroupField[];
      stage: QuestionStage;
    };

/** One question inside a `group` step. Same two shapes, without an icon or its own screen. */
export type GroupField =
  | { id: AnswerKey; kind: 'money'; label: string; help: string; placeholder: string; record: string; optional?: boolean }
  | { id: AnswerKey; kind: 'choice'; label: string; help: string; options: ChoiceOption[]; record: string; optional?: boolean };

export const STEPS: Step[] = [
  {
    id: 'industry',
    record: 'Sector',
    kind: 'industry',
    icon: 'building-2',
    stage: 'baseline',
    title: 'What industry is your business in?',
    help: 'Start typing and pick the closest match. This sets the multiple your sector can command when a business runs like a well-oiled machine.',
  },
  {
    id: 'turnover',
    record: 'Annual turnover',
    kind: 'money',
    icon: 'trending-up',
    stage: 'baseline',
    title: "Roughly what's your annual turnover?",
    help: 'Total sales - everything the business invoices or takes in over a year, before any costs come out. We ask about profit on the next screen.',
    placeholder: 'e.g. 2,000,000',
  },
  {
    id: 'annualProfit',
    record: 'Annual profit (SDE)',
    kind: 'money',
    icon: 'trending-up',
    stage: 'baseline',
    // NOT "PROFIT" in capitals (register P17). The shout was there to separate this question from
    // the turnover one before it, and it is the wrong instrument: "I can read." The separation is
    // carried by SDE_DEFINITION below, which says "Not turnover" in words, and by the fact that the
    // previous screen just asked for turnover by name.
    title: "And what's your annual profit?",
    help: SDE_DEFINITION,
    placeholder: 'e.g. 200,000',
  },
  {
    id: 'profitTrend',
    record: 'Profit over five years',
    kind: 'choice',
    icon: 'trending-up',
    stage: 'baseline',
    title: 'Over the last 5 years, profit has been…',
    help: 'The direction of travel matters more than any single year.',
    options: [
      { value: 'growing_strongly', label: 'Growing strongly', sub: 'Up meaningfully most years' },
      { value: 'growing', label: 'Growing steadily', sub: 'Up a bit most years' },
      { value: 'flat', label: 'Flat', sub: 'Ticking along about the same' },
      { value: 'declining', label: 'Declining', sub: 'Down more years than not' },
    ],
  },
  {
    id: 'marginTrend',
    record: 'Margins',
    kind: 'choice',
    icon: 'trending-up',
    stage: 'baseline',
    title: 'And your margins?',
    help: 'What you keep from every dollar of revenue.',
    options: [
      { value: 'improving', label: 'Improving', sub: 'Keeping more of every dollar' },
      { value: 'stable', label: 'Holding steady', sub: 'About the same as always' },
      { value: 'shrinking', label: 'Getting squeezed', sub: 'Costs rising faster than prices' },
    ],
  },
  {
    id: 'clientTrend',
    record: 'Client base',
    kind: 'choice',
    icon: 'users',
    stage: 'baseline',
    title: 'Your client base is…',
    help: 'Whether demand is building or fading.',
    options: [
      { value: 'expanding', label: 'Expanding', sub: 'Winning new clients faster than losing them' },
      { value: 'stable', label: 'Stable', sub: 'Winning about as many as we lose' },
      { value: 'shrinking', label: 'Shrinking', sub: 'Losing more than we win' },
    ],
  },
  {
    id: 'clientConcentration',
    record: 'Revenue spread',
    kind: 'choice',
    icon: 'users',
    stage: 'baseline',
    title: 'How spread out is your revenue?',
    help: 'A buyer worries when too much rides on a handful of clients - especially ones who deal with you personally.',
    options: [
      { value: 'diversified', label: 'Well spread', sub: 'No single client is more than ~10%' },
      // ⚠️ THE BAND GAP RAY FELL INTO, and it is the band most contractors his size sit in.
      // "My biggest is 40% and it is one client. Neither box is true. I picked the second one and it
      // is wrong — one client at 40% is not 'most of it'. There is a gap in your bands between 30%
      // and about 50%."
      // The VALUES are unchanged, so no score moves and no stored answer is reinterpreted; the
      // wording now covers the range continuously instead of leaving a hole between them.
      { value: 'moderate', label: 'A few big ones', sub: 'Top client is roughly 10-30%' },
      { value: 'concentrated', label: 'One dominant client', sub: 'Top client is more than about a third of it' },
    ],
  },
  {
    id: 'ownerDependence',
    record: 'If you took three months off',
    kind: 'choice',
    icon: 'user-cog',
    stage: 'baseline',
    title: 'If you took a 3-month holiday tomorrow, what happens?',
    help: 'This is the single biggest driver of what your business is worth - and the thing most owners never think about until they try to sell.',
    options: [
      { value: 'i_am_the_business', label: 'It would fall apart', sub: 'I am the business' },
      { value: 'heavily_involved', label: 'It would struggle', sub: 'I am heavily involved day to day' },
      { value: 'mostly_runs', label: 'It would mostly run', sub: 'A few things would need me' },
      { value: 'fully_managed', label: 'It would run fine', sub: 'Fully under management' },
    ],
  },
  {
    id: 'systems',
    record: 'Processes and know-how',
    kind: 'choice',
    icon: 'file-stack',
    stage: 'baseline',
    title: 'Your processes, pricing and know-how are…',
    help: 'The operating system of the business. Where does it actually live?',
    options: [
      { value: 'documented_team', label: 'Documented, and a team runs them', sub: 'Written down, not just remembered' },
      { value: 'some', label: 'Partly written down', sub: 'Some of it is, the rest is habit' },
      { value: 'in_my_head', label: "Mostly in my head", sub: 'I just know how it all works' },
    ],
  },
  {
    id: 'recurringRevenue',
    record: 'Revenue locked in ahead',
    kind: 'choice',
    icon: 'repeat',
    stage: 'baseline',
    title: 'How much revenue is locked in ahead of time?',
    help: 'Contracts, retainers, memberships, repeat accounts - anything a buyer can count on continuing.',
    options: [
      { value: 'strong', label: 'A lot', sub: 'Contracts / recurring accounts carry us' },
      { value: 'some', label: 'Some', sub: 'A handful of accounts we can rely on' },
      { value: 'none', label: 'Almost none', sub: 'We start each month from scratch' },
    ],
  },
  {
    id: 'tangibleAssets',
    record: 'Gear, vehicles and stock',
    kind: 'money',
    icon: 'wrench',
    stage: 'baseline',
    title: 'Rough value of your gear, vehicles and stock?',
    help: 'Equipment, tools, vehicles, inventory - what you could sell if you simply closed up. A ballpark is fine; enter 0 if little applies.',
    placeholder: 'e.g. 150000',
  },
  // THE TWELFTH QUESTION. Assets, then liabilities — they belong next to each other, and he is
  // already in the frame of mind.
  //
  // WHY IT EXISTS. The result page used to end with a disclaimer telling him to do this himself:
  // "Subtract any loans, equipment finance, lease obligations or tax owing to get to that." A
  // 66-year-old with $380k of equipment finance: "you could have asked in one box and shown me the
  // number I actually care about, which is what lands in my pocket... That's the number I'd
  // screenshot and show my wife." Asking is one input; the arithmetic was already ours to do.
  //
  // WHY IT IS SAFE TO ADD. It changes nothing about the MODEL. `multiple × SDE` is the value of the
  // business regardless of financing (enterprise value); what he keeps is that minus what the
  // business owes. So debt is subtracted at the PAGE, comes off `today` and `potential` equally, and
  // therefore leaves the GAP — and with it the multiple, MODEL_VERSION, every stored snapshot and
  // the price he is quoted — completely untouched.
  //
  // ⚠️ It is only correct because SDE is PRE-debt-service. If an owner hands us a profit figure that
  // has already absorbed his interest, this subtracts his debt a second time. That is why the
  // interest add-back had to become visible in the worked example and the confirmation note before
  // this question could ship — see lib/valuation/sde-copy.ts.
  {
    id: 'businessDebt',
    record: 'What the business owes',
    kind: 'money',
    icon: 'landmark',
    stage: 'baseline',
    title: 'Roughly what does the business owe?',
    help: 'Vehicle and equipment finance, overdraft, ATO debt, outstanding leases. A rough figure is fine. Leave it blank if you would rather not say - everything else still works.',
    placeholder: 'e.g. 380000',
    // The help text has said "leave it blank" since this question shipped, and Next was disabled
    // until a figure was typed. See the `optional` field on the Step type.
    optional: true,
  },
  // ─── THE LAST SCREEN — the three questions that turn a valuation of the BUSINESS into what he
  //     would actually walk away with (register P7).
  //
  // "The entire product is aimed at a man in his sixties and never once asks how long he's got."
  // "WIP and retentions — real money on other people's balance sheets." "He owns the yard through
  // his super fund; for a trade business often the biggest single question in the deal."
  //
  // ONE SCREEN, NOT THREE, and the shape is the decision. His own framing was "one more screen turns
  // an indicative valuation of the business into roughly what you'd walk away with — that's the
  // number I'd screenshot and show my wife." Three more steps would have taken the questionnaire
  // from 12 to 15 on the strength of a fix to a complaint about it being incomplete, and the
  // eleven-questions-in-three-minutes shape is the best-reviewed thing on the site.
  //
  // EACH ANSWER IS TREATED DIFFERENTLY, and the differences are the honest part:
  //   WIP        adds to every figure, the mirror image of debt. Nothing about the model moves.
  //   PREMISES   changes NO number at all. It buys a disclosure — the property is not in these
  //              figures, and a buyer will normalise the rent. Pricing it would need a market rent
  //              we do not have (see `Premises` in lib/valuation/model.ts).
  //   TIMEFRAME  changes no number and never leaves this device (H3 — lib/valuation/exit-timing.ts).
  {
    id: 'closing',
    kind: 'group',
    icon: 'clock',
    stage: 'baseline',
    title: 'Three last things',
    help: 'These do not change what the business is worth. They change what you would actually be left with, and what the number above means for you.',
    fields: [
      {
        id: 'workInProgress',
        kind: 'money',
        record: 'Work in progress and retentions',
        label: 'Roughly how much is owed to you for work already done?',
        help: 'Work in progress, invoices out, retentions held on jobs. Money that is yours but not in the bank yet. Leave blank if it does not apply.',
        placeholder: 'e.g. 95000',
        optional: true,
      },
      {
        id: 'premises',
        kind: 'choice',
        record: 'Premises',
        label: 'The yard, workshop or office — who owns it?',
        help: 'Including through a self-managed super fund, which for a lot of trade businesses is where the property sits.',
        options: [
          { value: 'owns', label: 'I do', sub: 'Personally, or through my super fund' },
          { value: 'rents', label: 'We rent it', sub: 'From someone else' },
          { value: 'none', label: 'No premises', sub: 'We work out of vehicles or from home' },
        ],
        optional: true,
      },
      {
        id: 'exitTimeframe',
        kind: 'choice',
        record: 'When you would like to be out',
        label: 'How long would you like to keep running it?',
        // The promise this makes is kept by `forSharing` in lib/valuation/share.ts, and pinned by a
        // test. Saying it here is also the most persuasive thing on the screen for a man deciding
        // whether to answer this honestly at all.
        help: 'Two years and eight years are completely different advice, so it changes what we tell you below. This one answer stays on this device — it is not sent anywhere, not attached to any account, and it changes none of the figures.',
        options: EXIT_TIMEFRAME_OPTIONS.map((o) => ({ value: o.value, label: o.label, sub: o.sub })),
        optional: true,
      },
    ],
  },
];

/**
 * The steps a given surface asks.
 *
 * ⚠️ NOT `STEPS.filter(...)` INLINE AT EVERY CALL SITE, which is what a second surface will reach
 * for first. The public page must render the baseline set and nothing else, and a filter written out
 * by hand in two files is the duplication this module exists to end — one of them will be updated
 * and the other will not.
 */
export function stepsForStage(stage: QuestionStage): Step[] {
  return STEPS.filter((s) => s.stage === stage);
}

/**
 * The questionnaire, flattened for the record block — group fields hoisted to the top level.
 *
 * Derived from `STEPS` rather than written out, so the record cannot fall behind the questions.
 */
export const RECORD_STEPS: SummaryStep[] = STEPS.flatMap<SummaryStep>((step) =>
  step.kind === 'group'
    ? step.fields.map<SummaryStep>((f) => ({
        id: f.id,
        kind: f.kind,
        record: f.record,
        options: 'options' in f ? f.options : undefined,
      }))
    : [
        {
          id: step.id,
          kind: step.kind,
          record: step.record,
          options: 'options' in step ? step.options : undefined,
        },
      ],
);

/**
 * How many QUESTIONS there are, as opposed to how many SCREENS.
 *
 * ⚠️ THESE ARE DIFFERENT NUMBERS AND THE PROSE HAS ALREADY DRIFTED. `STEPS.length` is 13 — the count
 * of screens — and the intro button renders it. The dashboard's invitation card says "Eleven
 * questions" in hard-coded prose, which was true before the debt question and the closing group and
 * has been wrong since. A group screen holds three questions, so the two counts diverge by design
 * and any surface quoting a number must say which one it means.
 *
 * Both are exported so no surface has to compute one from the other and get it wrong.
 */
export const SCREEN_COUNT = STEPS.length;

export const QUESTION_COUNT = STEPS.reduce(
  (n, step) => n + (step.kind === 'group' ? step.fields.length : 1),
  0,
);
