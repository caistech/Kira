// scripts/backfill-genome-register.mjs
//
// Rewrite already-stored memories into the owner's register: statements of the BUSINESS, not
// reports about a person.
//
// WHY. The distil wrote "content" in the third person by instruction, and /my-genome renders it
// verbatim under a heading that says "You said this on". So the owner's own handover manual read as
// a file someone was keeping on him — for a man who has told nobody he is selling, exactly the wrong
// feeling. The prompt is fixed (lib/kira/memory-extract.ts); this brings the existing rows across.
//
// DRY RUN BY DEFAULT. It prints every before/after and writes nothing until you pass --apply. This
// edits the owner's memory, which is the product's core asset; a script that mutates it on an
// unqualified `node scripts/…` is a script that will one day be run by accident.
//
// REVERSIBLE. The original wording is kept in kira_memory.content_original (migration
// 20260731120000). That is also how a re-run knows what it has already touched, so running twice is
// safe and never rewrites a rewrite.
//
// THE FAILURE THAT MATTERS is not an awkward sentence — it is a rewrite that quietly changes a FACT.
// A margin, a client name, a date, in a document meant for a buyer. So the prompt is told to change
// wording only, and every row where a number or a capitalised name present in the original is absent
// from the rewrite is REFUSED and reported rather than written.
//
// Usage:
//   node --env-file=.env.local scripts/backfill-genome-register.mjs              # dry run
//   node --env-file=.env.local scripts/backfill-genome-register.mjs --apply
//   node --env-file=.env.local scripts/backfill-genome-register.mjs --user <id> --limit 20
//   node --env-file=.env.local scripts/backfill-genome-register.mjs --revert --apply

import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
}

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const APPLY = has('--apply');
const REVERT = has('--revert');
const USER = valueOf('--user');
const LIMIT = Number(valueOf('--limit')) || 500;
const MODEL = process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini';
const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM = `You rewrite one sentence of a business's handover manual.

Change ONLY the voice. Rewrite it as a statement of the BUSINESS rather than a report about a
person: drop "he said", "she mentioned", "the user wants", and any personal name, then state the
fact itself.

  IN:  "Dennis says he prices commercial jobs at cost plus 18%."
  OUT: "Commercial jobs are priced at cost plus 18%."
  IN:  "He mentioned that Wavecrest is his biggest client and Dave is the contact."
  OUT: "Wavecrest is the largest client; the relationship runs through Dave."

If the fact is genuinely about the person rather than the business — how they prefer to work, be
contacted, or be spoken to — write "The owner prefers…" instead. Never use their name.

EVERY figure, client name, product name, date and proper noun in the input must appear unchanged in
the output. Do not add, infer, soften, summarise or explain anything. If the sentence already reads
as a statement of the business, return it EXACTLY as given.

Reply with the rewritten sentence and nothing else.`;

async function rewrite(content) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content },
      ],
    }),
  });
  if (!res.ok) throw new Error(`model returned ${res.status}`);
  const json = await res.json();
  return String(json?.choices?.[0]?.message?.content ?? '').trim().replace(/^["']|["']$/g, '');
}

/**
 * Did the rewrite keep every fact?
 *
 * Numbers and capitalised words are the load-bearing parts of a manual entry — a price, a
 * percentage, a client, a suburb. A rewrite that drops one has changed the meaning, whatever it
 * looks like. Personal names are the deliberate exception: removing those is the entire point.
 */
function factsSurvived(before, after) {
  const numbers = (s) => (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]$/, ''));
  const missingNumbers = numbers(before).filter((n) => !after.includes(n));

  const proper = (s) => [...new Set((s.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? []))];
  // Sentence-initial words and the owner's own name are expected to move or vanish.
  const beforeProper = proper(before).filter((w) => !before.startsWith(w));
  const missingProper = beforeProper.filter((w) => !after.includes(w));

  return { ok: missingNumbers.length === 0 && missingProper.length === 0, missingNumbers, missingProper };
}

async function main() {
  let query = sb
    .from('kira_memory')
    .select('id, user_id, content, content_original, genome_section')
    .neq('active', false)
    .order('created_at', { ascending: true })
    .limit(LIMIT);
  if (USER) query = query.eq('user_id', USER);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  if (REVERT) {
    const touched = (rows ?? []).filter((r) => r.content_original);
    console.log(`${touched.length} rewritten rows to restore.${APPLY ? '' : '  (dry run — pass --apply)'}`);
    for (const r of touched) {
      console.log(`  ${r.id}\n    now:      ${r.content}\n    restore:  ${r.content_original}`);
      if (APPLY) {
        const { error: e } = await sb
          .from('kira_memory')
          .update({ content: r.content_original, content_original: null })
          .eq('id', r.id);
        if (e) console.error(`    FAILED: ${e.message}`);
      }
    }
    return;
  }

  if (!OPENAI_API_KEY) throw new Error('Need OPENAI_API_KEY to rewrite');

  // Rows already rewritten are skipped, which is what makes a second run harmless. 'none' rows are
  // skipped too: they are filtered out of the Genome, so rewriting them spends money on text the
  // owner will never read.
  const candidates = (rows ?? []).filter((r) => !r.content_original && r.genome_section !== 'none');
  console.log(
    `${candidates.length} of ${rows?.length ?? 0} rows to consider.${APPLY ? '' : '  DRY RUN — nothing will be written. Pass --apply.'}\n`,
  );

  const stats = { unchanged: 0, rewritten: 0, refused: 0, failed: 0 };

  for (const row of candidates) {
    const before = String(row.content ?? '').trim();
    if (!before) continue;

    let after;
    try {
      after = await rewrite(before);
    } catch (e) {
      stats.failed += 1;
      console.error(`FAILED  ${row.id}: ${e.message}`);
      continue;
    }

    if (!after || after === before) {
      stats.unchanged += 1;
      continue;
    }

    const check = factsSurvived(before, after);
    if (!check.ok) {
      // Reported loudly and left alone. A dropped figure or client name in a document meant for a
      // buyer is the one outcome worth failing the whole backfill over.
      stats.refused += 1;
      console.warn(
        `REFUSED ${row.id}\n  before: ${before}\n  after:  ${after}\n  lost:   ${[...check.missingNumbers, ...check.missingProper].join(', ')}\n`,
      );
      continue;
    }

    stats.rewritten += 1;
    console.log(`REWRITE ${row.id}\n  before: ${before}\n  after:  ${after}\n`);

    if (APPLY) {
      const { error: writeError } = await sb
        .from('kira_memory')
        .update({ content: after, content_original: before })
        .eq('id', row.id);
      if (writeError) {
        stats.rewritten -= 1;
        stats.failed += 1;
        console.error(`  WRITE FAILED: ${writeError.message}`);
      }
    }
  }

  console.log(
    `\n${APPLY ? 'Applied' : 'Dry run'}: ${stats.rewritten} rewritten · ${stats.unchanged} already in voice · ` +
      `${stats.refused} refused (a fact would have been lost) · ${stats.failed} failed`,
  );
  if (stats.refused) console.log('Refused rows are unchanged. Read them above and decide by hand.');
  if (!APPLY && stats.rewritten) console.log('Re-run with --apply to write. --revert --apply restores originals.');
}

await main();
