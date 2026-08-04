// Every section this module exports a MARKER for must appear in the prompt it builds.
//
// THE FAILURE THIS EXISTS FOR, and it is mine, from 2026-08-04. The live prompt was rebuilt from
// source and pushed to ten agents. It correctly replaced a six-month-old persona and removed a
// stale signup snapshot — and it silently DELETED four sections that had been present, because
// getBusinessPrompt never emitted them. They had only ever been appended by patch scripts:
//
//   ## NEVER SAY YOU CHECKED SOMETHING YOU DID NOT   (tool honesty)
//   ## WHO IS ACTUALLY ASKING                        (authority)
//   ## ONE ACCOUNT, ONE BUSINESS                     (entity separation)
//   ## WHEN HE TYPES INSTEAD OF SPEAKING             (typed input)
//
// Entity separation is a MEASURED control: the red team scores it 5-6/6, and without it facts about
// Corporate AI Solutions land in the Factory2Key genome. Losing it was not a cosmetic regression.
//
// The root cause is the same one the rebuild was fixing, pointing the other way: a prompt assembled
// in two places. Source drifting ahead of the agents gave a stale persona; agents holding something
// source could not reproduce gave this. A marker exported here is a promise that the section ships.

import { describe, expect, it } from 'vitest';
import {
  getKiraPrompt,
  CAPABILITY_BOUNDARY_MARKER,
  FINANCIALS_SECTION_MARKER,
  FILES_AND_CONTACTS_MARKER,
  TOOL_HONESTY_MARKER,
  AUTHORITY_MARKER,
  TYPED_INPUT_MARKER,
  ENTITY_SEPARATION_MARKER,
  CONFIRMATION_MARKER,
  TASK_LEDGER_MARKER,
  type KiraFramework,
} from './prompts';

const REQUIRED_IN_BUSINESS: Array<[string, string]> = [
  ['capability boundary', CAPABILITY_BOUNDARY_MARKER],
  ['financials', FINANCIALS_SECTION_MARKER],
  ['files and contacts', FILES_AND_CONTACTS_MARKER],
  ['tool honesty', TOOL_HONESTY_MARKER],
  ['authority', AUTHORITY_MARKER],
  ['typed input', TYPED_INPUT_MARKER],
  ['entity separation', ENTITY_SEPARATION_MARKER],
  ['confirmation loop', CONFIRMATION_MARKER],
  ['task ledger', TASK_LEDGER_MARKER],
];

const framework: KiraFramework = {
  userName: 'Dennis McMahon',
  firstName: 'Dennis',
  location: 'Geraldton, WA',
  journeyType: 'business',
  primaryObjective: '',
  keyContext: [],
};

describe('the built business prompt is complete', () => {
  const { systemPrompt } = getKiraPrompt({ framework });

  for (const [name, marker] of REQUIRED_IN_BUSINESS) {
    it(`emits the ${name} section`, () => {
      expect(systemPrompt).toContain(marker);
    });
  }

  it('emits every marker exactly once', () => {
    // Twice means two assemblers are both adding it — the condition that produced the original
    // drift, caught before it reaches an agent rather than six months later.
    for (const [name, marker] of REQUIRED_IN_BUSINESS) {
      const count = systemPrompt.split(marker).length - 1;
      expect(count, `${name} appears ${count} times`).toBe(1);
    }
  });
});
