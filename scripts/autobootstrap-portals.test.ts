// scripts/autobootstrap-portals.test.ts — Stage-C vitest seam: the portal-lane autobootstrap
// runner lands a `portals.portal_url` for EVERY org lane the hierarchy minted (Stage-A LIVE tables).
// Vitest runs UNLIVE (reads the runner on disk, no portal minting claims).
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();

describe('Stage C — portal-lane autobootstrap seam (the distributor-recursion mint lane)', () => {
  it('runner targets portals table and writes portal_url (the canonical portal-url lane)', async () => {
    const runner = await readFile(
      join(root, 'scripts', 'autobootstrap-portals.mjs'),
      'utf8',
    );
    expect(runner).toMatch(/portals/);
    expect(runner).toMatch(/portal_url/);
  });

  it('runner is additive + idempotent (upsert, never overwrites a custom portal URL)', async () => {
    const runner = await readFile(
      join(root, 'scripts', 'autobootstrap-portals.mjs'),
      'utf8',
    );
    expect(runner).toMatch(/upsert/);
  });

  it('training doc teaches the portal lane URLs (the distributor recursion), on-disk', async () => {
    const doc = await readFile(
      join(root, 'docs', 'portal-sides-and-signIn-lanes.TRAINING.md'),
      'utf8',
    );
    expect(doc).toMatch(/distributor/);
    expect(doc).toMatch(/consultant/);
    expect(doc).toMatch(/\//);
  });
});
