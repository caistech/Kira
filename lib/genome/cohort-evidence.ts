// lib/genome/cohort-evidence.ts
//
// Retirement for coverage is only honest with numbers behind it. "Everyone now answers it" is not a
// vibe — it is a verifiable claim about the genome_item_status rows the cohort has already produced.
// This module computes that claim so it can be checked BESIDE the flag:
//
//   * the FLAG-TIME snapshot: flagRetired appends these numbers to evidence_note, so the journal is
//     self-describing even without a live query
//   * the READ-TIME readout: the admin page renders the current numbers on every admitted row, so
//     the operator can judge whether an item discriminates BEFORE retiring it — and a reader can
//     re-check the claim after the fact
//
// The metric is deliberately conservative. A retired item is one where the cohort now answers it
// substantively — so the strong signal is the SHARE OF LANDED VERDICTS that are substantive
// (substantivePct), and coverage (the share of assessed owners who have actually landed a verdict)
// keeps "everyone" honest: flagging an item retired when a third of recent assessments are still
// open is a very different claim from flagging one where everyone has answered.
//
// Users, not rows: genome_item_status is per-user per-item; a re-assessment updates the row, so
// duplicate user_ids are collapsed keeping the LATEST assessment (the input arrives ordered by
// assessed_at desc).

export type VerdictStatus = 'open' | 'weak' | 'answered';

export interface CohortEvidenceRow {
  user_id: string;
  status: VerdictStatus;
}

export interface CohortEvidence {
  /** Distinct assessed owners in the window. */
  totalAssessed: number;
  answered: number;
  weak: number;
  open: number;
  /** answered / (answered + weak). null when no one has landed a verdict yet. */
  substantivePct: number | null;
  /** (answered + weak) / totalAssessed — the share who have actually answered rather than left it. */
  coveragePct: number;
  /** The window size used (best effort — fewer distinct users means fewer usable rows). */
  window: number;
}

/**
 * Pure reducer: dedupe by user (latest wins, rows arrive ordered desc by assessed_at), take the
 * newest `limit` distinct users, and count the verdicts.
 */
export function reduceCohortEvidence(
  rows: CohortEvidenceRow[],
  limit = 25,
): CohortEvidence {
  const latestByUser = new Map<string, CohortEvidenceRow>();
  for (const row of rows) {
    if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row);
  }

  const distinct = [...latestByUser.values()].slice(0, Math.max(1, limit));
  let answered = 0;
  let weak = 0;
  let open = 0;
  for (const row of distinct) {
    if (row.status === 'answered') answered += 1;
    else if (row.status === 'weak') weak += 1;
    else open += 1;
  }

  const landed = answered + weak;
  const substantivePct = landed === 0 ? null : Math.round((answered / landed) * 1000) / 10;
  const totalAssessed = distinct.length;

  return {
    totalAssessed,
    answered,
    weak,
    open,
    substantivePct,
    coveragePct: totalAssessed === 0 ? 0 : Math.round((landed / totalAssessed) * 1000) / 10,
    window: limit,
  };
}

/** One-line, quotable rendering of the claim — what the journal stores at flag time. */
export function cohortSnapshotText(evidence: CohortEvidence): string {
  if (evidence.totalAssessed === 0) {
    return `By the numbers: 0 assessed in this window — no cohort evidence exists for this claim yet.`;
  }
  const substantive =
    evidence.substantivePct === null
      ? 'no verdicts landed yet'
      : `${evidence.answered} substantive (${evidence.substantivePct}% of those who answered)`;
  return (
    `By the numbers (last ${evidence.totalAssessed} distinct assessments): ${substantive}, ` +
    `${evidence.weak} weak, ${evidence.open} unanswered, ` +
    `${evidence.coveragePct}% coverage.`
  );
}

/**
 * Fetch the cohort verdicts for one admitted question and reduce them. `limit` is the WINDOW — the
 * newest N distinct assessments the claim is judged against.
 *
 * Fail-soft: a read failure returns null so the caller can render "cohort evidence unavailable"
 * rather than break the whole page.
 */
export async function cohortEvidenceFor(
  supabase: unknown,
  itemKey: string,
  limit = 25,
): Promise<CohortEvidence | null> {
  try {
    const client = supabase as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: unknown; error: unknown }>;
            };
          };
        };
      };
    };
    const { data, error } = await client
      .from('genome_item_status')
      .select('user_id, status')
      .eq('item_key', itemKey)
      .order('assessed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[cohort-evidence] read failed:', error);
      return null;
    }
    return reduceCohortEvidence((data ?? []) as CohortEvidenceRow[], limit);
  } catch (err) {
    console.error('[cohort-evidence] crashed:', err);
    return null;
  }
}

/**
 * Same as `cohortEvidenceFor` but for many item keys in ONE query (the admin page renders every
 * admitted row's numbers without an N+1). Rows arrive grouped by item; each group reduces
 * independently. Fails softly per-key: a key with no rows simply is absent from the result.
 */
export async function cohortEvidenceForMany(
  supabase: unknown,
  itemKeys: string[],
  limit = 25,
): Promise<Map<string, CohortEvidence>> {
  const out = new Map<string, CohortEvidence>();
  const unique = [...new Set(itemKeys)];
  if (unique.length === 0) return out;

  try {
    const client = supabase as {
      from: (t: string) => {
        select: (cols: string) => {
          in: (col: string, vals: string[]) => {
            order: (col: string, opts: { ascending: boolean }) => Promise<{
              data: unknown;
              error: unknown;
            }>;
          };
        };
      };
    };
    const { data, error } = await client
      .from('genome_item_status')
      .select('user_id, item_key, status')
      .in('item_key', unique)
      .order('assessed_at', { ascending: false });

    if (error) {
      console.error('[cohort-evidence] batch read failed:', error);
      return out;
    }

    const byKey = new Map<string, CohortEvidenceRow[]>();
    for (const row of data as { user_id: string; item_key: string; status: VerdictStatus }[]) {
      const bucket = byKey.get(row.item_key) ?? [];
      bucket.push({ user_id: row.user_id, status: row.status });
      byKey.set(row.item_key, bucket);
    }

    for (const [key, rows] of byKey) {
      out.set(key, reduceCohortEvidence(rows, limit));
    }
  } catch (err) {
    console.error('[cohort-evidence] batch crashed:', err);
  }
  return out;
}