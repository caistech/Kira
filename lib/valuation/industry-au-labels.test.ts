import { describe, expect, it } from 'vitest';

import { INDUSTRY_OPTIONS, industryLabel } from './industry-options';
import { synonymSector } from './industry-synonyms';
import { SECTOR_MULTIPLES } from './sde-multiples';

// THE LIST IS THE FIRST THING HE TOUCHES, AND IT IS WHERE HE DECIDES WHETHER THE NUMBER THAT
// FOLLOWS IS ABOUT HIS COUNTRY OR SOMEBODY ELSE'S.
//
//   "That's an American list with American spelling. We have service stations and jewellers and
//    centres. 'Medical Billing' isn't a business here… I spent thirty seconds scrolling and thinking
//    this is an American tool with Australia pasted on the front. You then tell me the sector sets
//    my multiple. If the list is borrowed, the multiple is borrowed." — Ray, 2026-08-16
//
// The medians genuinely are US sold-transaction data and replacing them is a different job (new
// numbers, a MODEL_VERSION bump, a rescore of every stored baseline). This changes what he READS.

describe('the industry list reads Australian', () => {
  it('renames the entries that read as American', () => {
    expect(industryLabel('Gas Stations')).toBe('Service Stations');
    expect(industryLabel('Jewelry Stores')).toBe('Jewellers');
    expect(industryLabel('Gyms & Fitness Centers')).toContain('Centres');
    expect(industryLabel('Day Care & Child Care')).toContain('Childcare');
  });

  it('names mining services and civil, which he could not find at all', () => {
    expect(industryLabel('Heavy Construction')).toContain('mining services');
    expect(industryLabel('Heavy Construction')).toContain('Civil');
  });

  it('leaves anything already Australian alone', () => {
    expect(industryLabel('Plumbing')).toBe('Plumbing');
    expect(industryLabel('Electrical & Mechanical Contracting')).toBe('Electrical & Mechanical Contracting');
  });

  it('⚠️ only relabels sectors that exist — a label for a renamed row is invisible', () => {
    // A stale key fails silently: the option keeps its American name and the map still looks right.
    const names = new Set(SECTOR_MULTIPLES.map((s) => s.name));
    for (const name of ['Gas Stations', 'Jewelry Stores', 'Heavy Construction', 'Routes (vending/distribution)']) {
      expect(names.has(name)).toBe(true);
    }
  });

  it('⚠️ NEVER changes the VALUE — the multiple lookup and every stored answer are untouched', () => {
    // If a label ever leaked into an option's value, a picked sector would stop matching the table
    // and the owner would silently be priced off the market average instead of his own sector. This
    // is the assertion that makes the change safe without a MODEL_VERSION bump or a rescore.
    for (const option of INDUSTRY_OPTIONS) {
      expect(SECTOR_MULTIPLES.some((s) => s.name === option)).toBe(true);
    }
  });
});

describe('the words he would actually type resolve to a real sector', () => {
  it.each([
    ['mining services', 'Heavy Construction'],
    ['mine site services', 'Heavy Construction'],
    ['civil contractor', 'Heavy Construction'],
    ['roadworks', 'Heavy Construction'],
    ['earthworks', 'Landscaping & Earthmoving'],
    ['ag contracting', 'Landscaping & Earthmoving'],
  ])('%s resolves to %s', (typed, sector) => {
    expect(synonymSector(typed)).toBe(sector);
  });
});
