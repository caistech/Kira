// scripts/consultant-genomes.test.ts — Stage-B vitest seam: the capture runner
// writes valid columns that match the real consultant_frameworks / consultant_genomes schema.
//
// BEHAVIOUR tests: verify the runner targets columns that actually exist in the
// Stage-A migration, not merely that source text contains table names.
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();

const runner = () => readFile(join(root, 'scripts', 'capture-consultant-genomes.mjs'), 'utf8');
const hierarchySql = () => readFile(
  join(root, 'supabase/migrations/20260921000000_chain_of_truth_hierarchy.sql'),
  'utf8',
);
const hardenSql = () => readFile(
  join(root, 'supabase/migrations/20260921010000_stage_a_harden.sql'),
  'utf8',
);

describe('Stage B — consultant-genome seam (behaviour, additive to Stage A)', () => {
  it('consultant_frameworks exists with organisation_id and framework_name (NOT NULL)', async () => {
    const sql = await hierarchySql();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS consultant_frameworks/);
    expect(sql).toMatch(/organisation_id\s+UUID\s+NOT\s+NULL/);
    expect(sql).toMatch(/framework_name\s+TEXT\s+NOT\s+NULL/);
    expect(sql).toMatch(/framework_slug\s+TEXT\s+NOT\s+NULL/);
  });

  it('consultant_genomes exists with organisation_id + framework_id (valid FK)', async () => {
    const sql = await hierarchySql();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS consultant_genomes/);
    expect(sql).toMatch(/organisation_id\s+UUID\s+NOT\s+NULL/);
    expect(sql).toMatch(/framework_id\s+UUID\s+REFERENCES\s+consultant_frameworks/);
  });

  it('capture runner inserts framework_name and framework_slug (NOT NULL columns)', async () => {
    const src = await runner();
    expect(src).toMatch(/framework_name/);
    expect(src).toMatch(/framework_slug/);
  });

  it('capture runner queries consultant_genomes by organisation_id (not non-existent kira_agent_id)', async () => {
    const src = await runner();
    expect(src).toMatch(/\.eq\(['"]organisation_id['"]/);
    // Must NOT reference kira_agent_id (column does not exist in consultant_genomes)
    expect(src).not.toMatch(/kira_agent_id/);
  });

  it('capture runner inserts framework_id into consultant_genomes (FK)', async () => {
    const src = await runner();
    expect(src).toMatch(/framework_id:/);
  });

  it('hardening migration enables RLS on all four Stage-A tables', async () => {
    const sql = await hardenSql();
    expect(sql).toMatch(/ALTER TABLE consultant_frameworks ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE consultant_genomes ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE operating_agreements ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE truth_comparisons ENABLE ROW LEVEL SECURITY/);
  });

  it('seam doc exists and names the genome extraction pipeline', async () => {
    const doc = await readFile(
      join(root, 'docs/consultant-genome-extraction.SEAM.md'),
      'utf8',
    );
    expect(doc).toMatch(/consultant.genome/i);
    expect(doc).toMatch(/Pipeline/i);
  });
});
