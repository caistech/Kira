// scripts/split-genome-entity.mjs
//
// One Kira account is one BUSINESS. Sort the memory corpus accordingly, and park what belongs to
// another one.
//
// WHY THIS RUNS BEFORE THE REGISTER REWRITE. The tenant identity on everything this account sends is
// The Trustee for Factory2Key Unit Trust — so the Genome it produces is a document ABOUT Factory2Key,
// and a fact filed there is a claim about that business. The corpus had accumulated across demos and
// carried a second entity's work: Global Buildtech Australia, trading as Corporate AI Solutions.
//
// Rewriting first would cement it. "Dennis is raising money for the Long Tail AI Fund" becomes
// "Money is being raised for the Long Tail AI Fund", which removes the one token that made the
// misfiling visible and leaves a sentence asserting Factory2Key raises AI funds. Sorting first is
// the difference between a manual that is wrong and one that is wrong AND no longer looks it.
//
// PARKED, NOT DELETED. Rows are deactivated with a recorded reason (kira_memory.parked_reason,
// migration 20260731140000). Deleting would be indistinguishable from the data loss this codebase
// has already had twice this week, and it forecloses standing up the other entity's account later.
//
// UNCLEAR IS NEVER PARKED. A memory the classifier cannot place stays exactly where it is and is
// reported for a human to read. Removing something from a business's handover document on a guess is
// the one outcome worth more than the tidying is worth.
//
// Usage:
//   node --env-file=.env.local scripts/split-genome-entity.mjs                 # dry run
//   node --env-file=.env.local scripts/split-genome-entity.mjs --apply
//   node --env-file=.env.local scripts/split-genome-entity.mjs --user <id>
//   node --env-file=.env.local scripts/split-genome-entity.mjs --restore --apply

import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY');
}

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valueOf = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : null;
};

const APPLY = has('--apply');
const RESTORE = has('--restore');
const USER = valueOf('--user');
const LIMIT = Number(valueOf('--limit')) || 1000;
const MODEL = process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini';
const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const PARKED_REASON = 'entity:ai_business';

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY);

const SYSTEM = `You sort one fact into the business it belongs to. The person these notes are about
runs two separate businesses and the notes are mixed together.

BUSINESS A — "factory2key"
Modular construction and land development. Site deliveries, lots and subdivisions, surveyors, soil
testing, town planning, building approvals, councils, builders, trades, property, project delivery.

BUSINESS B — "ai_business"
Software and AI products, trading as Corporate AI Solutions. Building or selling AI platforms and
agents, voice assistants, memory systems, developer tooling, SaaS products, raising money for AI
funds, pitching AI software to companies, technical implementation of any of the above.

NEITHER — "neutral"
Facts about the person's own working habits, or about how he wants this assistant to behave: what he
prefers, how he likes to be asked things, what the assistant should record or remind him of. These
are true regardless of which business he is doing, so they belong to both.

If a fact plausibly belongs to more than one, or you cannot tell, answer "unclear". Do not guess:
being wrong removes a real fact from a business's handover document.

Answer with exactly one word: factory2key, ai_business, neutral, or unclear.`;

async function classify(content) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 6,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: content.slice(0, 1200) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`model returned ${res.status}`);
  const json = await res.json();
  const answer = String(json?.choices?.[0]?.message?.content ?? '').trim().toLowerCase();
  return ['factory2key', 'ai_business', 'neutral', 'unclear'].includes(answer) ? answer : 'unclear';
}

async function restore() {
  let q = sb.from('kira_memory').select('id, content').eq('parked_reason', PARKED_REASON);
  if (USER) q = q.eq('user_id', USER);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  console.log(`${data?.length ?? 0} parked rows to restore.${APPLY ? '' : '  (dry run — pass --apply)'}`);
  for (const row of data ?? []) console.log(`  ${row.id}  ${String(row.content).slice(0, 90)}`);
  if (!APPLY || !data?.length) return;
  const { error: writeError } = await sb
    .from('kira_memory')
    .update({ active: true, parked_reason: null })
    .eq('parked_reason', PARKED_REASON);
  if (writeError) throw new Error(writeError.message);
  console.log(`Restored ${data.length}.`);
}

async function main() {
  if (RESTORE) return restore();
  if (!OPENAI_API_KEY) throw new Error('Need OPENAI_API_KEY to classify');

  let q = sb
    .from('kira_memory')
    .select('id, user_id, content, genome_section')
    .neq('active', false)
    .order('created_at', { ascending: true })
    .limit(LIMIT);
  if (USER) q = q.eq('user_id', USER);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);

  console.log(
    `${rows?.length ?? 0} active memories.${APPLY ? '' : '  DRY RUN — nothing will be parked. Pass --apply.'}\n`,
  );

  const buckets = { factory2key: [], ai_business: [], neutral: [], unclear: [], failed: [] };

  for (const row of rows ?? []) {
    const content = String(row.content ?? '').trim();
    if (!content) continue;
    let verdict;
    try {
      verdict = await classify(content);
    } catch (e) {
      buckets.failed.push({ ...row, error: e.message });
      continue;
    }
    buckets[verdict].push(row);
  }

  const show = (label, list, cap = 6) => {
    console.log(`\n${label}: ${list.length}`);
    for (const r of list.slice(0, cap)) console.log(`   ${String(r.content).slice(0, 110)}`);
    if (list.length > cap) console.log(`   … and ${list.length - cap} more`);
  };

  show('KEEP — Factory2Key', buckets.factory2key);
  show('KEEP — neutral (how he works / how the assistant should behave)', buckets.neutral);
  show('PARK — the AI business', buckets.ai_business, 10);
  // Printed in FULL, never truncated to a count: these are the ones a person has to decide, and a
  // summary line is how they get skipped.
  console.log(`\nUNCLEAR — left exactly as they are, for you to read: ${buckets.unclear.length}`);
  for (const r of buckets.unclear) console.log(`   ${r.id}\n     ${String(r.content).slice(0, 200)}`);
  if (buckets.failed.length) console.log(`\nFAILED to classify (left alone): ${buckets.failed.length}`);

  if (!APPLY) {
    console.log(`\nDry run. ${buckets.ai_business.length} would be parked. Re-run with --apply.`);
    return;
  }

  if (!buckets.ai_business.length) {
    console.log('\nNothing to park.');
    return;
  }

  const { error: writeError } = await sb
    .from('kira_memory')
    .update({ active: false, parked_reason: PARKED_REASON })
    .in(
      'id',
      buckets.ai_business.map((r) => r.id),
    );
  if (writeError) throw new Error(writeError.message);

  console.log(
    `\nParked ${buckets.ai_business.length} rows (active=false, parked_reason=${PARKED_REASON}).\n` +
      'Nothing deleted. --restore --apply brings them all back.',
  );
}

await main();
