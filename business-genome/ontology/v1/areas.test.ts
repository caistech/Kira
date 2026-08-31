// business-genome/ontology/v1/areas.test.ts
//
// VERIFICATION: The canonical ontology matches the locked specification.
// This test ensures the 9 areas are correct and the legacy key mapping is complete.

import { describe, it, expect } from 'vitest';
import {
  ONTOLOGY_AREAS,
  LEGACY_KEY_MAP,
  CANONICAL_TO_LEGACY,
  getArea,
  getAreaKeys,
  canonicalKey,
  legacyKey,
  isValidAreaKey,
  COVERAGE_BANDS,
  KNOWLEDGE_STATUSES,
  SOURCE_TYPES,
  GENOME_EVENT_TYPES,
} from './areas';

describe('Canonical Ontology v1', () => {
  describe('9 areas', () => {
    it('has exactly 9 areas', () => {
      expect(ONTOLOGY_AREAS).toHaveLength(9);
    });

    it('has unique keys', () => {
      const keys = ONTOLOGY_AREAS.map((a) => a.key);
      expect(new Set(keys).size).toBe(9);
    });

    it('matches the spec keys exactly', () => {
      const expectedKeys = [
        'work_sources',
        'pricing',
        'delivery',
        'money',
        'customers',
        'people',
        'assets',
        'compliance_calendar',
        'systems_records',
      ];
      const actualKeys = ONTOLOGY_AREAS.map((a) => a.key);
      expect(actualKeys).toEqual(expectedKeys);
    });

    it('has names matching the spec', () => {
      expect(getArea('work_sources')?.name).toBe('Where the work comes from');
      expect(getArea('pricing')?.name).toBe('How work is priced and quoted');
      expect(getArea('delivery')?.name).toBe('How the work actually gets done');
      expect(getArea('money')?.name).toBe('Money in, money out and terms');
      expect(getArea('customers')?.name).toBe('Who buys, and who owns the relationship');
      expect(getArea('people')?.name).toBe('Who does the work');
      expect(getArea('assets')?.name).toBe('What the business owns');
      expect(getArea('compliance_calendar')?.name).toBe('Licences, insurance and the calendar');
      expect(getArea('systems_records')?.name).toBe('Systems & records');
    });

    it('every area has core concepts', () => {
      ONTOLOGY_AREAS.forEach((area) => {
        expect(area.coreConcepts.length).toBeGreaterThan(0);
      });
    });

    it('every area has evidence requirements', () => {
      ONTOLOGY_AREAS.forEach((area) => {
        expect(area.evidenceRequirements.length).toBeGreaterThan(0);
      });
    });

    it('every area has relevance rules', () => {
      ONTOLOGY_AREAS.forEach((area) => {
        expect(area.relevanceRules.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Legacy key mapping', () => {
    it('maps all 9 legacy keys', () => {
      expect(Object.keys(LEGACY_KEY_MAP)).toHaveLength(9);
    });

    it('maps demand → work_sources', () => {
      expect(LEGACY_KEY_MAP.demand).toBe('work_sources');
    });

    it('maps pricing → pricing (unchanged)', () => {
      expect(LEGACY_KEY_MAP.pricing).toBe('pricing');
    });

    it('maps operations → delivery', () => {
      expect(LEGACY_KEY_MAP.operations).toBe('delivery');
    });

    it('maps cash → money', () => {
      expect(LEGACY_KEY_MAP.cash).toBe('money');
    });

    it('maps customers → customers (unchanged)', () => {
      expect(LEGACY_KEY_MAP.customers).toBe('customers');
    });

    it('maps people → people (unchanged)', () => {
      expect(LEGACY_KEY_MAP.people).toBe('people');
    });

    it('maps assets → assets (unchanged)', () => {
      expect(LEGACY_KEY_MAP.assets).toBe('assets');
    });

    it('maps compliance → compliance_calendar', () => {
      expect(LEGACY_KEY_MAP.compliance).toBe('compliance_calendar');
    });

    it('maps systems → systems_records', () => {
      expect(LEGACY_KEY_MAP.systems).toBe('systems_records');
    });

    it('reverse mapping is consistent', () => {
      Object.entries(LEGACY_KEY_MAP).forEach(([legacy, canonical]) => {
        expect(CANONICAL_TO_LEGACY[canonical]).toBe(legacy);
      });
    });
  });

  describe('Helper functions', () => {
    it('getArea returns correct area', () => {
      const area = getArea('pricing');
      expect(area).toBeDefined();
      expect(area?.key).toBe('pricing');
    });

    it('getArea returns undefined for unknown key', () => {
      expect(getArea('nonexistent')).toBeUndefined();
    });

    it('getAreaKeys returns all 9 keys', () => {
      expect(getAreaKeys()).toHaveLength(9);
    });

    it('canonicalKey maps legacy keys', () => {
      expect(canonicalKey('demand')).toBe('work_sources');
      expect(canonicalKey('operations')).toBe('delivery');
      expect(canonicalKey('cash')).toBe('money');
    });

    it('canonicalKey passes through unknown keys', () => {
      expect(canonicalKey('unknown')).toBe('unknown');
    });

    it('legacyKey maps canonical keys', () => {
      expect(legacyKey('work_sources')).toBe('demand');
      expect(legacyKey('delivery')).toBe('operations');
      expect(legacyKey('money')).toBe('cash');
    });

    it('isValidAreaKey validates correctly', () => {
      expect(isValidAreaKey('work_sources')).toBe(true);
      expect(isValidAreaKey('pricing')).toBe(true);
      expect(isValidAreaKey('nonexistent')).toBe(false);
    });
  });

  describe('Constants', () => {
    it('has 5 coverage bands', () => {
      expect(COVERAGE_BANDS).toHaveLength(5);
    });

    it('has 6 knowledge statuses', () => {
      expect(KNOWLEDGE_STATUSES).toHaveLength(6);
    });

    it('has 5 source types', () => {
      expect(SOURCE_TYPES).toHaveLength(5);
    });

    it('has 16 genome event types', () => {
      expect(GENOME_EVENT_TYPES).toHaveLength(16);
    });
  });
});
