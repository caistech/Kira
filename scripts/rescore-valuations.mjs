#!/usr/bin/env node
/**
 * Rescore every stored valuation onto the current MODEL_VERSION.
 *
 * WHY THIS EXISTS. The 2026-08-04 rubric replaced a band anchored on US sale medians with one
 * derived from the two reservation prices a real deal is bounded by — a seller who will not go
 * below 1.5x and a buyer who will not exceed 5x. That re-prices numbers already shown to people.
 * The operator's decision was RESCORE EVERYONE rather than freeze the old snapshots, on the grounds
 * that two owners holding contradictory numbers from the same product is worse than one owner
 * seeing his number change with an explanation.
 *
 * It is only possible because every snapshot stores its INPUTS alongside its outputs — the model's
 * own comments insisted on that precisely so a re-weighting could be re-derived rather than
 * guessed. This script is that insistence being cashed in.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. This repo already has a script that mutates thirteen
 * live agents with no flag at all, which is a trap nobody should walk into twice; a script that
 * re-prices what real owners have been told should be the last one to surprise anybody.
 *
 *   node scripts/rescore-valuations.mjs            # show every change, write nothing
 *   node scripts/rescore-valuations.mjs --apply    # write
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY (read from .env.local).
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { computeValuation, MODEL_VERSION } from '../lib/valuation/model.ts'

const APPLY = process.argv.includes('--apply')

/**
 * WHY THE OWNER'S NUMBER MOVED — one entry per MODEL_VERSION, and the script REFUSES to run without
 * the current one.
 *
 * This was a single hardcoded string, written for the 2026-08-04 rubric and still saying so on
 * 2026-08-08 — by which point it was not merely stale but BACKWARDS. It read "derived from the two
 * reservation prices rather than from US sale medians"; the 08-08 change went back TO sector
 * medians, corroborated ones. Applying the rescore would have stamped every owner's permanent
 * history with a description of the previous change, asserting the opposite of what happened.
 *
 * The reason is the only part of a rescue like this that a human ever reads. A snapshot row with
 * good numbers and a wrong explanation is worse than no snapshot, because it is quoted back with
 * confidence — and it survives precisely because nobody re-reads a string that already existed.
 *
 * So: keyed by version, and a missing key is a HARD STOP rather than a default. Whoever bumps
 * MODEL_VERSION next cannot rescore until they have written down what changed, which is the smallest
 * possible mechanism that makes remembering unnecessary.
 */
const RESCORE_REASONS = {
  '2026-08-04.1':
    'Rescored onto the 2026-08-04 rubric. The range is now derived from the two reservation ' +
    'prices a deal is bounded by — a seller will not go below 1.5x, a buyer will not exceed 5x ' +
    'and only reaches it for a business that is well run, transferable and has upside — rather ' +
    'than from US sale medians. Same answers, re-read against a stricter rubric.',
  '2026-08-08.1':
    'Rescored onto the 2026-08-08 rubric. The range now runs from your own sector\'s floor to its ' +
    'ceiling rather than one band shared by every industry, so what a business like yours actually ' +
    'changes hands for sets both ends. Australian published guidance on the same earnings basis ' +
    'corroborates those sector figures: a plumbing business is quoted locally at 2.0x on the tools ' +
    'and 3.5x once it runs without the owner, and the model now reproduces that range instead of ' +
    'pricing every trade against the same universal band. Two limits still apply on top — below ' +
    'about 1.5x an owner keeps working the business rather than sell it, and no buyer pays more ' +
    'than five years of profit for a small one. Same answers, re-read.',
  '2026-08-14.1':
    'Rescored onto the 2026-08-14 rubric, after an Australian business broker published his own ' +
    'valuation method and we checked ours against it. Two things changed. The bottom of the range ' +
    'now depends on the sector: in a lower-priced industry the gap between a struggling business ' +
    'and a strong one is proportionally wider than in a high-priced one, and the model had been ' +
    'treating that spread as the same everywhere. And the old rule that no business sells below ' +
    'about 1.5 times its earnings has been removed, because published Australian figures show ' +
    'smaller businesses regularly changing hands below that. For most owners this moves today\'s ' +
    'figure down somewhat. What you could unlock by capturing what is in your head is unchanged — ' +
    'that was never derived from the range. Same answers, re-read.',
}

const RESCORE_REASON = RESCORE_REASONS[MODEL_VERSION]
if (!RESCORE_REASON) {
  console.error(
    `No rescore reason recorded for MODEL_VERSION ${MODEL_VERSION}.\n` +
      `Add one to RESCORE_REASONS in this script before rescoring — it is written into every\n` +
      `owner's valuation history and is the only part of it a person reads.`,
  )
  process.exit(2)
}

function env(name) {
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${name}=`))
    if (line) return line.slice(name.length + 1).replace(/^["']|["']$/g, '').trim()
  } catch { /* fall through to process env */ }
  return process.env[name] || ''
}

const url = env('NEXT_PUBLIC_SUPABASE_URL')
const key = env('SUPABASE_SECRET_KEY')
if (!url || !key) {
  console.error('missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY')
  process.exit(2)
}
const db = createClient(url, key, { auth: { persistSession: false } })

const money = (n) => (n == null ? '—' : '$' + Math.round(n).toLocaleString())

const { data: rows, error } = await db
  .from('business_valuations')
  .select('user_id, inputs, worth_today, worth_potential, gap, walk_away, quoted_monthly, updated_at')

if (error) {
  console.error('read failed:', error.message)
  process.exit(1)
}

console.log(`${APPLY ? 'APPLYING' : 'DRY RUN'} — target MODEL_VERSION ${MODEL_VERSION}`)
console.log(`${rows.length} stored valuation(s)\n`)

let changed = 0
let skipped = 0
let failed = 0

for (const row of rows) {
  if (!row.inputs || typeof row.inputs !== 'object' || !row.inputs.annualProfit) {
    console.log(`SKIP  ${row.user_id}  — no usable stored inputs `)
    skipped += 1
    continue
  }

  let next
  try {
    next = computeValuation(row.inputs)
  } catch (e) {
    console.log(`FAIL  ${row.user_id}  — ${e.message}`)
    failed += 1
    continue
  }

  const beforeToday = row.worth_today
  const delta = beforeToday ? ((next.today - beforeToday) / beforeToday) * 100 : 0

  console.log(
    // business_valuations carries no model_version column — only the snapshots table does — so the
    // current row's provenance is not printable here. The snapshot appended below records it.
    `${row.user_id}  -> ${MODEL_VERSION}\n` +
      `    today     ${money(beforeToday).padStart(12)} -> ${money(next.today).padStart(12)}  ` +
      `(${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%)\n` +
      `    potential ${money(row.worth_potential).padStart(12)} -> ${money(next.potential).padStart(12)}\n` +
      `    gap       ${money(row.gap).padStart(12)} -> ${money(next.gap).padStart(12)}  ` +
      `multiple ${next.appliedMultipleToday.toFixed(2)}x`,
  )
  changed += 1

  if (!APPLY) continue

  const { error: upErr } = await db
    .from('business_valuations')
    .update({
      worth_today: next.today,
      worth_potential: next.potential,
      gap: next.gap,
      walk_away: next.walkAway,
      sde_multiple: next.sdeMultiple,
      readiness: next.readiness,
    })
    .eq('user_id', row.user_id)

  if (upErr) {
    console.log(`    WRITE FAILED: ${upErr.message}`)
    failed += 1
    continue
  }

  // Append a snapshot so the movement is explained rather than appearing as unexplained drift on
  // the introducer board — which measures progress FROM these stored baselines.
  const { error: snapErr } = await db.from('business_valuation_snapshots').insert({
    user_id: row.user_id,
    model_version: MODEL_VERSION,
    inputs: row.inputs,
    source: 'manual',
    gap: next.gap,
    worth_today: next.today,
    worth_potential: next.potential,
    walk_away: next.walkAway,
    sde_multiple: next.sdeMultiple,
    readiness: next.readiness,
    readiness_potential: next.readinessPotential,
    reason: RESCORE_REASON,
  })
  if (snapErr) console.log(`    snapshot insert failed: ${snapErr.message}`)
}

console.log(
  `\n${APPLY ? 'applied' : 'would change'}: ${changed}   skipped: ${skipped}   failed: ${failed}`,
)
if (!APPLY && changed > 0) console.log('\nNothing was written. Re-run with --apply.')
