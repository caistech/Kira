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

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, OPENAI_API_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY');
}

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const APPLY = has('--apply');
const REVERT = has('--revert');
/**
 * Re-process rows that were already rewritten.
 *
 * Always from content_original, never from the current text — rewriting a rewrite compounds drift,
 * and the original is the only wording we know came from the conversation. Needed because the first
 * pass left the owner's name in three entries where he was the OBJECT of the sentence rather than
 * its subject, which the prompt had not covered.
 */
const REDO = has('--redo');
const USER = valueOf('--user');
const LIMIT = Number(valueOf('--limit')) || 500;
const MODEL = process.env.KIRA_EXTRACTION_MODEL || 'gpt-4.1-mini';
const BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY);

const SYSTEM = `You rewrite one sentence of a business's handover manual.

Change ONLY the voice. Rewrite it as a statement of the BUSINESS rather than a report about a
person: drop "he said", "she mentioned", "the user wants", and any personal name, then state the
fact itself.

  IN:  "Dennis says he prices commercial jobs at cost plus 18%."
  OUT: "Commercial jobs are priced at cost plus 18%."
  IN:  "He mentioned that Wavecrest is his biggest client and Dave is the contact."
  OUT: "Wavecrest is the largest client; the relationship runs through Dave."

If the fact is genuinely about the person rather than the business — what they prefer, believe,
want, or how they like to work — write "The owner prefers/believes/wants…".

NEVER USE THEIR NAME, IN ANY POSITION. Not as the subject, and not as the object or possessive
either — "ask Dennis to confirm" and "access to Dennis's emails" are the same mistake as "Dennis
says". Write "the owner" where the person is genuinely required, and prefer a form that does not
need them at all.

  IN:  "When unclear, Dennis should be asked to specify which project."
  OUT: "When the project is unclear, ask the owner which one is meant."
  IN:  "The assistant does not have access to Dennis's emails."
  OUT: "The assistant does not have access to the owner's emails." 

Do not open every sentence with "The business". A manual states things directly: "Quotes are priced
at cost plus 18%", not "The business prices quotes at cost plus 18%". Where a multi-sentence entry is
all about the same subject, say it once and let the rest follow.

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
 * Every capitalised word that is capitalised only because a sentence started there.
 *
 * "This wizard should…" and "Believes the agent should…" are not proper nouns, and a rewrite that
 * re-flows the sentences will legitimately lose them. The first version of this checked only whether
 * the WHOLE string started with the word, which caught the first sentence and none of the rest — so
 * four of the first five refusals were noise. A guard that cries wolf gets switched off, which is
 * exactly how the thing it was protecting stops being protected.
 */
function sentenceInitial(text) {
  return new Set((text.match(/(?:^|[.!?]\s+|\n\s*)([A-Z][a-zA-Z]{2,})/g) ?? []).map((m) => m.trim().replace(/^[.!?]\s*/, '')));
}

/**
 * Did the rewrite keep every fact?
 *
 * Numbers and proper nouns are the load-bearing parts of a manual entry — a price, a percentage, a
 * client, a suburb. A rewrite that drops one has changed the meaning, whatever it reads like.
 *
 * TWO DELIBERATE EXCEPTIONS, and both were claimed by the comment here before they were implemented.
 * Sentence-initial words are not proper nouns. And the OWNER'S OWN NAME is the thing this rewrite
 * exists to remove — refusing a rewrite for dropping "Dennis" would refuse every rewrite that
 * worked. Names are passed in rather than guessed, because guessing which capitalised word is the
 * owner is how a client's name gets treated as disposable.
 */
function factsSurvived(before, after, ownerNames = []) {
  const numbers = (s) => (s.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]$/, ''));
  const missingNumbers = numbers(before).filter((n) => !after.includes(n));

  const initial = sentenceInitial(before);
  const owner = new Set(ownerNames.map((n) => n.toLowerCase()));
  const beforeProper = [...new Set((before.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? []))].filter(
    (w) => !initial.has(w) && !owner.has(w.toLowerCase()),
  );
  const missingProper = beforeProper.filter((w) => !after.includes(w));

  return { ok: missingNumbers.length === 0 && missingProper.length === 0, missingNumbers, missingProper };
}

/**
 * The owner's own name(s), so the guard does not defend them.
 *
 * Read from what he told us rather than inferred: the sign-off name he confirmed at setup, and his
 * account first/last name. Anything else capitalised is somebody else's — a client, a site, a
 * supplier — and stays protected.
 */
async function ownerNamesFor(userId) {
  const names = new Set();
  const add = (value) => {
    for (const part of String(value ?? '').split(/\s+/)) if (part.length > 2) names.add(part);
  };
  const { data: identity } = await sb
    .from('business_identity')
    .select('sign_off_name')
    .eq('user_id', userId)
    .maybeSingle();
  add(identity?.sign_off_name);
  const { data: user } = await sb.from('users').select('first_name, name').eq('id', userId).maybeSingle();
  add(user?.first_name);
  add(user?.name);
  return [...names];
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
  const candidates = (rows ?? []).filter(
    (r) => (REDO ? true : !r.content_original) && r.genome_section !== 'none',
  );
  console.log(
    `${candidates.length} of ${rows?.length ?? 0} rows to consider.${APPLY ? '' : '  DRY RUN — nothing will be written. Pass --apply.'}\n`,
  );

  const stats = { unchanged: 0, rewritten: 0, refused: 0, failed: 0 };

  // Looked up once per owner rather than per row — same answer every time, and this runs over
  // hundreds of rows.
  const namesByUser = new Map();

  for (const row of candidates) {
    if (!namesByUser.has(row.user_id)) namesByUser.set(row.user_id, await ownerNamesFor(row.user_id));
    // On a redo, the ORIGINAL is the input. The current text is already one model pass away from
    // what he actually said, and feeding it back in would compound that rather than correct it.
    const before = String((REDO && row.content_original) || row.content || '').trim();
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

    const check = factsSurvived(before, after, namesByUser.get(row.user_id) ?? []);
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
        // content_original is only set the FIRST time, so a redo never overwrites the true original
        // with an intermediate rewrite.
        .update({ content: after, content_original: row.content_original ?? before })
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
