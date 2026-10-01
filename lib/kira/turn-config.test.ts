// Pins the turn-taking fix (John Orian, 2026-09-29/10-01) at the source.
//
// The first fix changed turn_eagerness and hardcoded turn_timeout: 7 into all three creation paths,
// so every agent kept asking "are you still there?" every seven seconds. These tests fail if the
// silence re-prompt comes back, or if a creation path stops taking the shared definition.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KIRA_TURN_CONFIG } from './turn-config';

const CREATION_PATHS = [
  'app/api/kira/create/route.ts',
  'app/api/kira/ensure/route.ts',
  'lib/kira/elevenlabs.ts',
];

describe('KIRA_TURN_CONFIG', () => {
  it('never re-prompts a silent owner on a short timer', () => {
    // -1 = never. Anything else must be long enough to fetch a file (the API caps it at 300).
    const timeout = KIRA_TURN_CONFIG.turn_timeout as number;
    expect(timeout === -1 || timeout >= 120).toBe(true);
  });

  it('waits out a pause rather than taking the turn', () => {
    expect(KIRA_TURN_CONFIG.turn_eagerness).toBe('patient');
  });

  it.each(CREATION_PATHS)('%s takes the shared definition and hardcodes no turn_timeout', (path) => {
    const source = readFileSync(path, 'utf8');
    expect(source).toContain('KIRA_TURN_CONFIG');
    expect(source).not.toMatch(/turn_timeout\s*:/);
  });
});
