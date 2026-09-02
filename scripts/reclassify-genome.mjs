// scripts/reclassify-genome.mjs
//
// Re-file the whole Genome after a change to the classifier.
//
// WHY A SCRIPT AND NOT JUST THE CRON. The hourly sweep will get there eventually, but a classifier
// change needs to be SEEN before it is trusted — the last one silently filed a third of the corpus
// under the wrong heading and nobody noticed until a tester read the page as a customer would. This
// prints every verdict so the change can be judged, not assumed.
//
// THE PROMPT IS READ FROM lib/genome/derive.ts, not copied. A one-off script carrying its own copy of
// the prompt is a second source of truth that drifts the moment the real one is edited, and the drift
// is invisible: both "work", they just disagree.
//
// Usage:
//   node --env-file=.env.local scripts/reclassify-genome.mjs            # dry run, prints verdicts
//   node --env-file=.env.local scripts/reclassify-genome.mjs --apply
//   node --env-file=.env.local scripts/reclassify-genome.mjs --user <id>

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY || !OPENAI_API_KEY) {
  throw new Error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY + OPENAI_API_KEY');
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const USER = args.includes('--user') ? args[args.indexOf('--user') + 1] : null;
const MODEL = process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini';
const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY);

/** Lift the live prompt out of the source, so this can never disagree with what production does. */
function classifySystem() {
  const src = readFileSync(new URL('../lib/genome/derive.ts', import.meta.url), 'utf8');
  const start = src.indexOf('const CLASSIFY_SYSTEM = `');
  const open = src.indexOf('`', start);
  const close = src.indexOf('`.trim();', open + 1);
  if (start < 0 || close < 0) throw new Error('Could not read CLASSIFY_SYSTEM from lib/genome/derive.ts');
  return src.slice(open + 1, close).trim();
}

const SYSTEM = classifySystem();

async function classify(content) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 120,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: String(content).slice(0, 900) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`model returned ${res.status}`);
  const json = await res.json();
  const parsed = JSON.parse(json?.choices?.[0]?.message?.content ?? '{}');
  return {
    section: String(parsed.section ?? '').trim().toLowerCase(),
    headline: typeof parsed.headline === 'string' ? parsed.headline.trim().slice(0, 90) : '',
  };
}

let q = sb.from('kira_memory').select('id, user_id, content').neq('active', false).limit(500);
if (USER) q = q.eq('user_id', USER);
const { data: rows, error } = await q;
if (error) throw new Error(error.message);

console.log(`${rows.length} active memories.${APPLY ? '' : '  DRY RUN — nothing written. Pass --apply.'}\n`);

const counts = {};
let failed = 0;

for (const row of rows) {
  let verdict;
  try {
    verdict = await classify(row.content);
  } catch (e) {
    failed += 1;
    console.error(`FAILED ${row.id}: ${e.message}`);
    continue;
  }
  counts[verdict.section] = (counts[verdict.section] || 0) + 1;

  const label = verdict.section === 'none' ? 'EXCLUDED ' : verdict.section.padEnd(12).toUpperCase();
  console.log(`${label} ${verdict.headline || '—'}`);
  if (verdict.section !== 'none') console.log(`             ${String(row.content).slice(0, 130)}`);

  if (APPLY) {
    const { error: writeError } = await sb
      .from('kira_memory')
      .update({
        genome_section: verdict.section,
        genome_headline: verdict.headline || null,
        genome_classified_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    if (writeError) console.error(`  WRITE FAILED ${row.id}: ${writeError.message}`);
  }
}

console.log('\n' + JSON.stringify(counts, null, 2));
console.log(`failed: ${failed}`);
const shown = Object.entries(counts).filter(([k]) => k !== 'none').reduce((a, [, v]) => a + v, 0);
console.log(`\n${shown} entries would appear in the Genome; ${counts.none ?? 0} correctly excluded.`);
if (!APPLY) console.log('Re-run with --apply to write.');
