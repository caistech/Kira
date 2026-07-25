// lib/kira/integration/stubs.ts
// Working stubs for Seams 2–4 (Seam 1's stub is ../swarm/stub.ts). Each does the honest thing Kira
// can do TODAY behind the partner's eventual adapter, and NEVER fakes a capability it doesn't have
// (degrade-don't-fake): an unsupported call throws/returns a clear "not connected" rather than a
// silent success. Swap in the real adapter via the env seam in ./index.ts.

import type {
  MemoryGovernance,
  DistilledMemory,
  SystemOfRecord,
  RecordWrite,
  RecordStatus,
  RecordCategory,
  AgentBuilder,
  AgentSpec,
  BuiltAgent,
} from './seams';
import { mnemoAdd, mnemoSearch, mnemoEnabled } from '@/lib/kira/mnemo';

// ---------------------------------------------------------------------------
// Seam 2 — MemoryGovernance: today Kira already owns distil→persist→recall on the experiential lane
// via @/lib/kira/mnemo (the post-call path dual-writes net-new distilled facts). This stub exposes
// that as the governance contract. When Gareth/Shah draw the working↔semantic boundary (§7–§11),
// their adapter replaces this and the write-ownership moves to whoever they nominate.
// ---------------------------------------------------------------------------
export class LocalMemoryGovernance implements MemoryGovernance {
  async distillAndPersist(tenantId: string, raw: { text?: string; facts?: string[] }): Promise<void> {
    // The CALLER distils (I4/S4): we persist only the already-distilled facts, never raw text/PII.
    const facts = (raw.facts ?? []).filter((f) => f && f.trim());
    if (!facts.length || !mnemoEnabled()) return; // fail-soft — no Mnemo key ⇒ near-term recall only
    await mnemoAdd(tenantId, facts);
  }

  async recallDeep(tenantId: string, query: string): Promise<DistilledMemory[]> {
    if (!mnemoEnabled()) return [];
    const hits = await mnemoSearch(tenantId, query);
    return (hits ?? []).map((h) => ({ content: typeof h === 'string' ? h : String((h as { content?: string })?.content ?? h) }));
  }

  scopeKey(tenantId: string): string {
    // Must match the Mnemo per-user scope used in @/lib/kira/mnemo (§10 — one key across all lanes).
    return `kira-user-${tenantId}`;
  }
}

// ---------------------------------------------------------------------------
// Seam 3 — SystemOfRecord: the CAS backbone (Layer 3) is NOT ours to build in this repo. The stub is
// deliberately honest — it records writes as `proposed` in a log so the shape + the HITL promote path
// are exercised, but it does not pretend to be an authoritative store. Gareth's backbone adapter (or
// a CAS backbone SDK) replaces this. Until then, authoritative facts still live in Kira's own tables.
// ---------------------------------------------------------------------------
export class StubSystemOfRecord implements SystemOfRecord {
  private log: Array<RecordWrite & { recordId: string; status: RecordStatus }> = [];

  async write(w: RecordWrite): Promise<{ recordId: string; status: RecordStatus }> {
    const status: RecordStatus = w.status ?? 'proposed';
    const recordId = `sor_${w.category}_${this.log.length + 1}`;
    this.log.push({ ...w, recordId, status });
    console.warn(
      `[integration/SystemOfRecord] STUB: recorded ${w.category} for ${w.tenantId} as ${status} ` +
        `(recordId=${recordId}). No CAS backbone connected — not an authoritative store.`,
    );
    return { recordId, status };
  }

  async promote(recordId: string, tenantId: string): Promise<void> {
    const row = this.log.find((r) => r.recordId === recordId && r.tenantId === tenantId);
    if (!row) throw new Error(`SystemOfRecord stub: record ${recordId} not found`);
    row.status = 'authoritative';
  }

  async read(tenantId: string, category: RecordCategory): Promise<unknown[]> {
    return this.log.filter((r) => r.tenantId === tenantId && r.category === category).map((r) => r.payload);
  }
}

// ---------------------------------------------------------------------------
// Seam 4 — AgentBuilder: Kira's own provisioning (app/api/kira/create) is a degenerate one-template
// builder. The stub does the half we own — map a discovery Client Profile → an AgentSpec (the converge
// point, §16). build() is NOT faked: without Gareth's builder there is no generic spin-up-any-agent,
// so it throws a clear "builder not connected". (Kira still mints its own single agent via the create
// route; this seam is about the swarm's roster + beyond-roster builder.)
// ---------------------------------------------------------------------------
export class StubAgentBuilder implements AgentBuilder {
  fromDiscovery(tenantId: string, clientProfile: Record<string, unknown>): AgentSpec {
    const useCase =
      String(clientProfile?.primary_objective ?? clientProfile?.primaryObjective ?? '') ||
      'Assist the owner with their business';
    return {
      tenantId,
      role: 'kira-exec',
      useCase,
      tools: ['recall_memory', 'save_memory', 'search_knowledge', 'dispatch_task', 'approve_task'],
      guardrails: ['nothing outbound without owner approval'],
    };
  }

  async build(_spec: AgentSpec): Promise<BuiltAgent> {
    throw new Error(
      'AgentBuilder stub: no swarm builder connected. Kira mints its own single agent via ' +
        '/api/kira/create; beyond-roster agent building is Gareth’s builder (Seam 4).',
    );
  }
}
