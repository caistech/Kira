// What gets WRITTEN, and — mostly — what does not.
//
// The arithmetic is tested in evidenced-readiness.test.ts. This is about the four states where the
// honest answer is to write nothing, because each of them would otherwise put a number on a screen
// that means something different from what it appears to mean.

import { describe, expect, it, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock('@/lib/supabase/server');
});

/** A valuation whose stored composite matches what the model reproduces from its own inputs. */
const INPUTS = {
  industry: 'Plumbing',
  turnover: 1_200_000,
  annualProfit: 240_000,
  tangibleAssets: 180_000,
  profitTrend: 'flat',
  marginTrend: 'stable',
  clientTrend: 'stable',
  clientConcentration: 'concentrated',
  ownerDependence: 'i_am_the_business',
  systems: 'in_my_head',
  recurringRevenue: 'none',
} as Record<string, unknown>;

// ⚠️ A DELIBERATELY MALFORMED ONE. The first draft of INPUTS above was invented rather than read off
// ValuationInputs, so computeValuation returned NaN — and the drift guard PASSED, because every
// comparison with NaN is false. That was a real defect in the guard, not in the test, and this input
// is kept so it can never come back.
const NONSENSE_INPUTS = { industry: 'Plumbing' } as Record<string, unknown>;

function mockDb({
  valuation,
  status = [],
  captureUpdate,
  valuationError = null,
}: {
  valuation: unknown;
  status?: { item_key: string; status: string; why: string | null }[];
  captureUpdate?: (patch: Record<string, unknown>) => void;
  valuationError?: unknown;
}) {
  vi.resetModules();
  vi.doMock('@/lib/supabase/server', () => ({
    createServiceClient: () => ({
      from: (table: string) => {
        if (table === 'business_valuations') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: valuation, error: valuationError }) }) }),
            update: (patch: Record<string, unknown>) => ({
              eq: async () => {
                captureUpdate?.(patch);
                return { error: null };
              },
            }),
          };
        }
        return { select: () => ({ eq: async () => ({ data: status, error: null }) }) };
      },
    }),
  }));
}

async function run() {
  const { recomputeEvidencedReadiness } = await import('./recompute-readiness');
  return recomputeEvidencedReadiness('org-1');
}

async function realBaseline() {
  const { computeValuation } = await import('./model');
  return computeValuation(INPUTS as never).readiness;
}

describe('when it writes nothing, and why', () => {
  it('no valuation — there is no origin to move from', async () => {
    // An owner who never ran the thirteen questions has a Genome and no baseline. Inventing an
    // origin for him is worse than showing bands alone.
    mockDb({ valuation: null });
    const r = await run();
    expect(r.readinessNow).toBeNull();
    expect(r.reason).toBe('no-valuation');
  });

  it('nothing assessed — the column stays NULL rather than echoing the baseline', async () => {
    // ⚠️ Writing a figure equal to the baseline would read as "measured, and unchanged". NULL reads
    // as "not measured yet", which is the true one.
    let wrote = false;
    mockDb({
      valuation: { inputs: INPUTS, readiness: await realBaseline() },
      status: [],
      captureUpdate: () => { wrote = true; },
    });
    const r = await run();
    expect(r.readinessNow).toBeNull();
    expect(r.reason).toBe('no-assessment');
    expect(wrote).toBe(false);
  });

  it('all-open assessment — an outage does not crater his valuation', async () => {
    let wrote = false;
    mockDb({
      valuation: { inputs: INPUTS, readiness: await realBaseline() },
      status: [
        { item_key: 'people.successor', status: 'open', why: null },
        { item_key: 'people.roster', status: 'open', why: null },
      ],
      captureUpdate: () => { wrote = true; },
    });
    const r = await run();
    expect(r.reason).toBe('no-assessment');
    expect(wrote).toBe(false);
  });

  it('⚠️ a model that returns no usable figure is refused, not written', async () => {
    // The guard that could not fire. NaN in, NaN past the comparison, NaN into the column.
    let wrote = false;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb({
      valuation: { inputs: NONSENSE_INPUTS, readiness: 0.3 },
      status: [{ item_key: 'people.successor', status: 'answered', why: null }],
      captureUpdate: () => { wrote = true; },
    });
    const r = await run();
    expect(r.reason).toBe('model-drift');
    expect(wrote).toBe(false);
  });

  it('⚠️ model drift — refuses rather than blending a code change into the delta', async () => {
    // THE LOAD-BEARING ONE. If the model has moved since the snapshot, a delta computed against it
    // is partly evidence and partly a re-weighting, with no way to tell them apart. A missing number
    // is honest; one that silently mixes those two is the thing MODEL_VERSION exists to prevent.
    let wrote = false;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockDb({
      valuation: { inputs: INPUTS, readiness: 0.9 }, // nowhere near what the model reproduces
      status: [{ item_key: 'people.successor', status: 'answered', why: null }],
      captureUpdate: () => { wrote = true; },
    });
    const r = await run();
    expect(r.reason).toBe('model-drift');
    expect(r.readinessNow).toBeNull();
    expect(wrote).toBe(false);
  });
});

describe('when it does write', () => {
  it('stores readiness_now and a timestamp, and never touches readiness', async () => {
    let patch: Record<string, unknown> | null = null;
    mockDb({
      valuation: { inputs: INPUTS, readiness: await realBaseline() },
      status: [{ item_key: 'people.successor', status: 'answered', why: null }],
      captureUpdate: (p) => { patch = p; },
    });
    const r = await run();

    expect(r.readinessNow).not.toBeNull();
    expect(patch).not.toBeNull();
    expect(patch!).toHaveProperty('readiness_now');
    expect(patch!).toHaveProperty('readiness_now_at');
    // ⚠️ The whole design in one assertion. The baseline is what he was shown when he paid.
    expect(patch!).not.toHaveProperty('readiness');
    expect(patch!).not.toHaveProperty('inputs');
  });

  it('returns the baseline too, so a caller can state a delta rather than a bare figure', async () => {
    mockDb({
      valuation: { inputs: INPUTS, readiness: await realBaseline() },
      status: [{ item_key: 'people.successor', status: 'answered', why: null }],
    });
    const r = await run();
    expect(r.baseline).toBeGreaterThan(0);
    expect(r.readinessNow).toBeGreaterThan(0);
  });
});

describe('it never throws', () => {
  it('a read failure degrades to "the number did not move"', async () => {
    // It runs off the back of an assessment the owner asked for. Losing that because the valuation
    // table was briefly unavailable would be trading the thing that worked for the thing that did not.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDb({ valuation: null, valuationError: { message: 'boom' } });
    await expect(run()).resolves.toMatchObject({ readinessNow: null });
  });
});
