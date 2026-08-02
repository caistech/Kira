// POST /api/admin/genome/reclassify — re-ask the classifier the two questions it was never asked.
//
// `genome_about` and `genome_private_reason` were added on 2 August (BUILD_REGISTER B13/B14). Rows
// classified before that carry NULL for both, and NULL means "never asked" rather than "asked and
// no" — so roughly six hundred existing facts have no privacy verdict and no business/software
// verdict at all. This is the backfill.
//
// ── WHY IT IS A ROUTE AND NOT A SCRIPT ─────────────────────────────────────────────────────────
//
// The proposal has to be produced by EXACTLY the code that will apply it, using EXACTLY the prompt
// that is deployed. A standalone script would need its own copy of the classifier — `derive.ts` is
// `server-only` and cannot be imported by a node script — and a second copy of a prompt is a fork
// that drifts silently, which is the failure the @caistech-first rule exists to prevent. Running it
// here means the review and the write agree by construction.
//
// ── WHY DRY-RUN IS THE DEFAULT, AND WHY APPLY TAKES THE PROPOSAL BACK ──────────────────────────
//
// Re-classification MOVES FACTS OUT OF A REAL OWNER'S GENOME. A row going `only-you` → `none`
// disappears from his page; he was not consulted and would not know why. So: nothing is written
// unless `apply` is present, and `apply` does not re-run the model — it takes back the exact
// decisions that were reviewed. With temperature 0 a re-run would *probably* match, and "probably"
// is not the standard for silently rewriting a business record. He applies what he read.
//
// Every applied change is returned as a journal the caller can store, so a revert is a replay of
// known previous values rather than a guess. Same posture as scripts/split-genome-entity.mjs.

import { NextResponse } from 'next/server';

import { isCurrentUserAdmin } from '@/lib/auth';
import { classifyForReview, applyReviewedClassification, type ProposedChange } from '@/lib/genome/derive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The model call is per row and the backfill is a few hundred rows; the default 15s would truncate
// the run and leave the operator reading a partial proposal as though it were the whole one.
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'Operators only' }, { status: 403 });
  }

  let body: { userId?: string; limit?: number; apply?: ProposedChange[]; revert?: ProposedChange[] } = {};
  try {
    body = await request.json();
  } catch {
    /* an empty body is a dry run over everything */
  }

  // REVERT — replay the journal backwards, restoring the values recorded at apply time. Checked
  // before apply so a body carrying both cannot half-do each.
  if (Array.isArray(body.revert) && body.revert.length > 0) {
    const reverted = await applyReviewedClassification(body.revert, { direction: 'before' });
    return NextResponse.json({ mode: 'revert', changed: reverted });
  }

  if (Array.isArray(body.apply) && body.apply.length > 0) {
    const applied = await applyReviewedClassification(body.apply, { direction: 'after' });
    return NextResponse.json({ mode: 'apply', changed: applied });
  }

  const proposal = await classifyForReview({ userId: body.userId, limit: body.limit ?? 1000 });
  return NextResponse.json({ mode: 'dry-run', ...proposal });
}
