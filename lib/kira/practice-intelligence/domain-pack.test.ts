// The sector seam: does the parameter mean anything?
//
// A generic tool that takes a `sector` argument and ignores it is worse than a healthcare-only tool
// that says so, because it tells the model — and the next person reading this — that something is
// configurable when it is not. These tests exist to keep the argument honest while there is exactly
// ONE pack, which is the state most likely to let it quietly become decorative.

import { describe, expect, it } from 'vitest';
import { DEFAULT_SECTOR, DOMAIN_PACKS, packFor, supportedSectors } from './domain-pack';
import { SIGNATURES } from './technology-detect';
import { HEALTHCARE_DIRECTORY_HOSTS, UNIVERSAL_NON_TARGET_HOSTS, isNonPracticeHost } from './site-selection';

describe('resolving a sector', () => {
  it('defaults to healthcare when none is given', () => {
    expect(packFor(undefined)?.sector).toBe('healthcare');
    expect(packFor(null)?.sector).toBe('healthcare');
    expect(packFor('')?.sector).toBe(DEFAULT_SECTOR);
  });

  it('is case- and whitespace-insensitive, because it comes from a model', () => {
    expect(packFor('  Healthcare ')?.sector).toBe('healthcare');
    expect(packFor('HEALTHCARE')?.sector).toBe('healthcare');
  });

  it('returns NULL for a sector we cannot research, rather than falling back', () => {
    // The important one. Falling back to healthcare would research a law firm with a list of dental
    // booking vendors, find none, and report "no online booking" with total confidence — a
    // confidently-wrong answer, which is the failure family this module has already been repaired
    // for once. Null becomes a sentence the owner can act on.
    expect(packFor('legal')).toBeNull();
    expect(packFor('construction')).toBeNull();
    expect(packFor('hospitality')).toBeNull();
  });

  it('says plainly what it does support', () => {
    expect(supportedSectors()).toEqual(['healthcare']);
  });
});

describe('the pack actually carries the industry-specific knowledge', () => {
  const pack = packFor('healthcare')!;

  it('owns the vendor table rather than the spine owning it', () => {
    expect(pack.signatures).toBe(SIGNATURES);
    expect(pack.signatures.length).toBeGreaterThan(10);
  });

  it('owns the industry directory hosts', () => {
    expect(pack.directoryHosts).toBe(HEALTHCARE_DIRECTORY_HOSTS);
    expect(pack.directoryHosts).toContain('healthdirect.gov.au');
  });

  it('owns the sector-specific unknowns', () => {
    // A builder has no practice-management system; asserting it as an open question for every
    // industry would be stating a false unknown.
    expect(pack.sectorUnknowns.join(' ')).toMatch(/practice management system/i);
  });

  it('owns the wording handed to the people extractor', () => {
    expect(pack.peoplePromptSubject).toMatch(/healthcare practice/i);
  });

  it('owns the search qualifier', () => {
    expect(pack.searchQualifier).toBe('medical practice');
  });
});

describe('the universal / sector split in host filtering', () => {
  it('rejects universal noise regardless of which pack is in play', () => {
    // These hold for any industry: a jobs board is never the organisation's own website, and the
    // jobs board is where the signal came from in the first place.
    for (const host of ['seek.com.au', 'au.indeed.com', 'facebook.com', 'linkedin.com']) {
      expect(isNonPracticeHost(host, [])).toBe(true);
    }
  });

  it('rejects healthcare directories only when the healthcare pack supplies them', () => {
    expect(isNonPracticeHost('healthdirect.gov.au', HEALTHCARE_DIRECTORY_HOSTS)).toBe(true);
    // With no sector directories supplied, a health directory is not special — which is exactly what
    // a different industry's pack would want, and proves the split is real rather than cosmetic.
    expect(isNonPracticeHost('healthdirect.gov.au', [])).toBe(false);
  });

  it('keeps the two lists genuinely disjoint', () => {
    // If an entry drifted into both, the split would be a comment rather than a structure.
    const overlap = HEALTHCARE_DIRECTORY_HOSTS.filter((h) => UNIVERSAL_NON_TARGET_HOSTS.includes(h));
    expect(overlap).toEqual([]);
  });

  it('still lets a real practice website through', () => {
    expect(isNonPracticeHost('examplemedicalcentre.com.au')).toBe(false);
  });
});

describe('the pack registry', () => {
  it('has exactly one pack, and that is stated rather than hidden', () => {
    // Not a limitation to be embarrassed about — the seam exists so the second one is a new pack
    // rather than a fork of the research spine. This test is here to make adding one deliberate.
    expect(DOMAIN_PACKS).toHaveLength(1);
  });

  it('has no duplicate sector keys', () => {
    const keys = DOMAIN_PACKS.map((p) => p.sector);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
