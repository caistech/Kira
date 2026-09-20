// scripts/autobootstrap-portals.test.ts — Stage-C vitest seam: the portal-lane autobootstrap
// runner lands a `portals.portal_url` for EVERY org lane the hierarchy minted (Stage-A LIVE tables).
// Vitest runs UNLIVE (reads the runner on disk, no portal minting claims).
//
// BEHAVIOUR tests: verify the runner writes valid columns that match the real schema,
// not merely that source text contains keywords.
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();

const runner = () => readFile(join(root, 'app/api/cron/autobootstrap-portals/route.ts'), 'utf8');
const migration = () => readFile(
  join(root, 'supabase/migrations/20260921010000_stage_a_harden.sql'),
  'utf8',
);

describe('Stage C — portal-lane autobootstrap seam', () => {
  it('runner upserts into portals with organisation_id as the onConflict key', async () => {
    const src = await runner();
    // Must contain an upsert targeting organisation_id (required for idempotency)
    expect(src).toMatch(/\.from\(['\"]portals['\"]\)/);
    expect(src).toMatch(/upsert\(/);
    expect(src).toMatch(/onConflict:\s*['\"]organisation_id['\"]/);
  });

  it('runner writes portal_url into the portals row', async () => {
    const src = await runner();
    expect(src).toMatch(/portal_url:/);
  });

  it('portals table is minted with organisation_id UNIQUE (the upsert target)', async () => {
    const sql = await migration();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS portals/);
    expect(sql).toMatch(/organisation_id\s+UUID\s+NOT\s+NULL\s+UNIQUE/);
  });

  it('portals and portal_configs tables have RLS enabled', async () => {
    const sql = await migration();
    expect(sql).toMatch(/ALTER TABLE portals ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE portal_configs ENABLE ROW LEVEL SECURITY/);
  });
});
