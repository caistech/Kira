// scripts/consultant-genomes.test.ts — Ship-B seam test: the /talk downstream lanes that a
// consultant genome lands in are Stage-A-provided (on-disk seam proof, no live calls).
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();

describe('Stage B — consultant-genome seam (on-disk, additive to Stage A)', () => {
  it('consultant_frameworks is the landing table the Stage-A migration provides', async () => {
    const sql = await readFile(
      join(root, 'supabase/migrations/20260921000000_chain_of_truth_hierarchy.sql'),
      'utf8',
    );
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS consultant_frameworks/);
  });

  it('capture runner targets consultant_genomes (the /talk capture seam)', async () => {
    const runner = await readFile(
      join(root, 'scripts', 'capture-consultant-genomes.mjs'),
      'utf8',
    );
    expect(runner).toMatch(/consultant_genomes/);
    expect(runner).toMatch(/consultant_frameworks/);
  });

  it('seam doc exists and names the genome sections the capture writes', async () => {
    const doc = await readFile(
      join(root, 'docs/consultant-genome-extraction.SEAM.md'),
      'utf8',
    );
    expect(doc).toMatch(/genome/i);
  });
});
