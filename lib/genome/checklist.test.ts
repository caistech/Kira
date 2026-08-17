// The checklist is only defensible if it stays tied to the two things it derives from.
//
// It asserts a per-bucket rubric that decides bands and feeds the valuation, so the failure mode
// that matters is not a typo — it is DRIFT. An area key renamed in `areas.ts`, or a factor renamed
// in `model.ts`, leaves this file syntactically perfect and silently scoring nothing. Both of those
// are checked against the OTHER FILE'S SOURCE here rather than against a restated constant, because
// a restated constant drifts in exactly the same way.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { GENOME_AREAS } from './areas';
import {
  CHECKLIST,
  itemByKey,
  itemsForArea,
  itemsForFactor,
  pathwayItems,
  requiredItemsForArea,
  type FactorKey,
} from './checklist';

const modelSource = readFileSync(
  path.resolve(__dirname, '..', 'valuation', 'model.ts'),
  'utf8',
);

describe('it stays tied to areas.ts', () => {
  it('every item names a real area', () => {
    const areas = new Set(GENOME_AREAS.map((a) => a.key));
    for (const item of CHECKLIST) {
      expect(areas, `${item.key} names an area that does not exist`).toContain(item.area);
    }
  });

  it('every area has at least one required item', () => {
    // An area with no required items can never be anything but 'covered', which would read as a
    // finished bucket over a question nobody asked. Nine areas, nine denominators.
    for (const area of GENOME_AREAS) {
      expect(
        requiredItemsForArea(area.key).length,
        `${area.key} has no required items — its bucket could never be honestly red`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('it stays tied to the valuation model', () => {
  it('every factor it names exists in the model WEIGHTS', () => {
    // ⚠️ THE LOAD-BEARING ONE. Read out of model.ts's own source, so renaming a weight there turns
    // this red instead of silently detaching every item mapped to it. A detached item does not
    // error — it simply stops moving the number, for everyone, permanently.
    const weights = modelSource.match(/const WEIGHTS = \{([^}]+)\}/)?.[1];
    expect(weights, 'could not find WEIGHTS in model.ts — this guard has stopped guarding').toBeTruthy();

    const known = new Set([...(weights as string).matchAll(/(\w+):/g)].map((m) => m[1]));
    expect(known.size).toBe(5);

    for (const item of CHECKLIST) {
      if (item.factor) {
        expect(known, `${item.key} maps to a factor the model does not have`).toContain(item.factor);
      }
    }
  });

  it('maps per item, not per area — most items move nothing', () => {
    // The whole reason for item-level mapping. If nearly everything carried a factor we would have
    // rebuilt the area→factor map this design rejects, and put weight on things a buyer does not
    // price. Assets is the proof case below.
    const mapped = CHECKLIST.filter((i) => i.factor).length;
    expect(mapped).toBeLessThan(CHECKLIST.length / 2);
  });

  it('assets moves the walk-away figure, never the multiple', () => {
    for (const item of itemsForArea('assets')) {
      expect(item.factor, `${item.key} should not move the multiple`).toBeNull();
    }
  });

  it('demand contributes to coverage but not to price, because its rank is undecided', () => {
    // areas.ts: a scorer "must refuse a null rank loudly rather than multiply it by zero and produce
    // a confident number over a question nobody answered". Demand still gets a band; it gets no
    // weight until somebody decides the rank.
    expect(itemsForArea('demand').length).toBeGreaterThan(0);
    for (const item of itemsForArea('demand')) {
      expect(item.factor, `${item.key} weights an area whose rank is null`).toBeNull();
    }
  });

  it('owner-dependence is evidenced across several areas, because it is the axis not an area', () => {
    // areas.ts calls owner-dependence "the AXIS, measured per area". If every ownerDependence item
    // sat in one bucket we would have made it an area by accident.
    const areas = new Set(itemsForFactor('ownerDependence').map((i) => i.area));
    expect(areas.size).toBeGreaterThanOrEqual(4);
  });
});

describe('the items are usable as a rubric', () => {
  it('every key is unique', () => {
    // Keys are stored against assessed rows. A duplicate silently merges two different questions.
    const keys = CHECKLIST.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every key is namespaced by its area, so a stray key is visible on sight', () => {
    for (const item of CHECKLIST) {
      expect(item.key.startsWith(`${item.area}.`), `${item.key} is not namespaced`).toBe(true);
    }
  });

  it('every required item carries a substance test', () => {
    // Required items are what "covered" means, so each must be able to fail for a stated reason.
    // Without this the rubric reverts to counting, which is the thing it replaces.
    for (const item of CHECKLIST.filter((i) => i.required)) {
      expect(item.substance, `${item.key} is required but has no substance test`).not.toBeNull();
    }
  });

  it('every substance test carries the reason, not only the verdict', () => {
    for (const item of CHECKLIST) {
      if (!item.substance) continue;
      expect(item.substance.tests.length, `${item.key} has no tests`).toBeGreaterThan(0);
      expect(item.substance.coaching.length, `${item.key} has no coaching`).toBeGreaterThan(20);
      expect(item.substance.weakExample).toBeTruthy();
      expect(item.substance.strongExample).toBeTruthy();
      // The strong example must actually be more substantial than the weak one. A pair where they
      // are the same length is usually a placeholder somebody meant to come back to.
      expect(
        item.substance.strongExample.length,
        `${item.key}: the strong example is not meaningfully stronger`,
      ).toBeGreaterThan(item.substance.weakExample.length);
    }
  });

  it('never refers to the owner in the third person on his own screen', () => {
    // areas.ts learned this from a tester: "being referred to in the third person reads like I've
    // walked in on two people discussing me." The buyer's phrasing belongs in the handover document;
    // the owner's belongs on his own screen.
    //
    // ⚠️ THIS ASSERTS THE ABSENCE OF THIRD-PERSON REFERENCE, NOT THE PRESENCE OF A PRONOUN. The
    // first draft required /you|your/ in every prompt and failed on "Which of them are on a
    // contract, and which just keep ringing?" — which addresses him perfectly well and simply has no
    // pronoun in it. Requiring one would push the copy toward "which of yours…", which is worse
    // English in service of a check. The defect is calling him "the owner" to his face.
    for (const item of CHECKLIST) {
      expect(item.ownerPrompt, `${item.key} refers to him in the third person`).not.toMatch(
        /\b(the owner|he |his |him\b)/i,
      );
      expect(item.buyerItem, `${item.key} buyer item addresses the reader`).not.toMatch(/\byour\b/i);
    }
  });

  // ⚠️ THERE IS DELIBERATELY NO "most prompts contain you/your" CHECK.
  //
  // One was written, at 0.6, and the real figure is 0.42 — because prompts like "Who does each of
  // those steps?", "What licences does the business hold?" and "Where do the files actually live?"
  // address him perfectly well with no pronoun in them, and 30 of the 52 are that shape. The only
  // ways to pass were to make the copy worse or to move the threshold to whatever the data happened
  // to be, and a threshold fitted to the observation asserts nothing at all — it just goes green
  // forever and reads like a guard. The third-person check above catches the defect that is real.
});

describe('gate 4 — what can only close by the business changing', () => {
  it('identifies pathway items', () => {
    expect(pathwayItems().length).toBeGreaterThan(5);
  });

  it('the successor question is a pathway, not a fact', () => {
    // The canonical one. Writing down "nobody can step into my job" does not make it less true, and
    // treating it as a fact to capture would mean a bucket could go green over an unfixed problem.
    expect(itemByKey('people.successor')?.closes).toBe('change');
    expect(itemByKey('people.successor')?.factor).toBe('ownerDependence');
  });

  it('every pathway item is one a buyer actually prices', () => {
    // A pathway asks an owner for months of real change. Offering one for something that moves
    // nothing spends his effort on our behalf. Demand is the deliberate exception — its items can
    // need real change while its rank stays undecided, so it cannot carry a factor yet.
    for (const item of pathwayItems()) {
      if (item.area === 'demand') continue;
      expect(item.factor, `${item.key} asks for change but moves nothing`).not.toBeNull();
    }
  });

  it('no compliance item claims what the owner NEEDS rather than what he has', () => {
    // DATA_STANDARD D1/D2: asserting a regulatory obligation wants an authoritative citable source,
    // never inference. Every compliance item must ask what is held, not what is required.
    for (const item of itemsForArea('compliance')) {
      expect(item.ownerPrompt, `${item.key} may be asserting an obligation`).not.toMatch(
        /\b(must|required to|obliged|need to hold)\b/i,
      );
    }
  });
});

describe('⚠️ every area can be WORKED, not just scored', () => {
  // WHY THIS IS SEPARATE FROM THE SCORING ASSERTIONS ABOVE. Those check the checklist against
  // areas.ts and model.ts, so an area cannot silently score nothing. This checks the other consumer:
  // `area_agenda` hands Kira up to three questions to ASK, drawn from `itemsForArea`. An area that
  // scores perfectly and yields no items is invisible to every test above and fatal in a
  // conversation — she offers it, promises "let me see what's already in it", and comes back with
  // nothing to say.
  //
  // It became reachable in a new way on 2026-08-18: the /my-genome opener now NAMES the emptiest
  // area and offers to start there, so the area she volunteers is by definition the one with no
  // status rows — the exact case where the agenda has to fall back to the raw item list.

  it('has questions for all nine, so none can be offered and then come up empty', () => {
    for (const area of GENOME_AREAS) {
      const items = itemsForArea(area.key);
      expect(items.length, `${area.key} has no checklist items — area_agenda would return nothing`).toBeGreaterThan(0);
    }
  });

  it('has at least one REQUIRED item per area — the fallback an untouched area relies on', () => {
    // An area with no status rows defaults every item to `open`, and the agenda prefers
    // required-open. With none, a brand-new owner gets the optional questions first, which is the
    // wrong first thing to ask a man who has told her nothing about that part of the business.
    for (const area of GENOME_AREAS) {
      const required = itemsForArea(area.key).filter((i) => i.required);
      expect(required.length, `${area.key} has no required items`).toBeGreaterThan(0);
    }
  });

  it('can fill the agenda from an untouched area', () => {
    // AGENDA_LIMIT is 3. An area holding fewer than three items would quietly under-fill, which
    // reads to her as "there is almost nothing left to ask here" on an area she knows nothing about.
    for (const area of GENOME_AREAS) {
      expect(itemsForArea(area.key).length, `${area.key} cannot fill a 3-question agenda`).toBeGreaterThanOrEqual(3);
    }
  });
});
