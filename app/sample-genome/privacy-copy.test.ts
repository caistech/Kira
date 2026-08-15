import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS — register P18, and K20 before it.
//
// The public page describing what an owner gets carried a roadmap note that opened: "Kira sits
// quietly in the background while you work and only wakes when you say her name — like Siri, but for
// your business."
//
// The heading above it said "not built yet". That does not help. Ray's reading, and he is the ICP:
// "for a man whose entire problem is leakage, 'sits quietly in the background' is not a feature,
// it's the thing I'm afraid of… the sentence before that lands first."
//
// This is the same shape as K20, where the agent invented "I watch what you do" — with the
// difference that here it was written down on purpose. Describing surveillance we have NOT built, to
// an audience defined by having told nobody they are selling, is the most expensive sentence
// available to this product, and it costs the same whether or not the capability exists.
//
// The guard is on the PHRASING, not on the feature. Privacy mode is a good roadmap item; describing
// it as an always-on microphone waiting for its name is what must not come back.
//
// ⚠️ Comments are stripped — the page's own note quotes the retired sentence to record what went and
// why, and the sibling scans learned that punishing an honest explanation teaches people to delete
// the explanation.

const PAGE = stripComments(readFileSync(join(__dirname, 'page.tsx'), 'utf8'));

describe('the privacy-mode copy does not describe surveillance we have not built', () => {
  it('finds the page and the section at all (a scan matching nothing is green forever)', () => {
    expect(PAGE.length).toBeGreaterThan(5_000);
    expect(PAGE).toContain('Privacy mode');
  });

  it('does not say she sits in the background', () => {
    expect(PAGE).not.toMatch(/in the background while you work/i);
    expect(PAGE).not.toMatch(/sits (quietly )?in the background/i);
  });

  it('does not describe an always-on assistant waiting for its name', () => {
    // "like Siri, but for your business" is the compact version of exactly the thing he is afraid
    // of, offered as a selling point.
    expect(PAGE).not.toMatch(/only wakes when you say her name/i);
    expect(PAGE).not.toMatch(/like Siri/i);
  });

  it('states what is true today BEFORE what is on the roadmap', () => {
    // The order is half the defect: a reassurance that arrives after the frightening sentence has
    // already landed is not a reassurance.
    const today = PAGE.indexOf('First, what is true today');
    const roadmap = PAGE.indexOf('What is coming');
    expect(today).toBeGreaterThan(-1);
    expect(roadmap).toBeGreaterThan(-1);
    expect(today).toBeLessThan(roadmap);
  });

  it('still says plainly that she hears nothing until he presses the button', () => {
    // The guard must not be satisfiable by deleting the section. What was removed was a claim; what
    // has to survive is the fact.
    //
    // ⚠️ WHITESPACE-TOLERANT, for the reason landing-example.test.ts already records: JSX prose wraps
    // across source lines, so a literal match fails on formatting rather than on meaning. It did
    // here, on "no listening in the / background". A check that reds on a line wrap gets deleted.
    expect(PAGE).toMatch(/hears\s+nothing\s+at\s+all\s+unless\s+you\s+open\s+a\s+conversation/i);
    expect(PAGE).toMatch(/no\s+listening\s+in\s+the\s+background/i);
  });

  it('still says the feature is not built', () => {
    expect(PAGE).toMatch(/not built yet/i);
  });
});
