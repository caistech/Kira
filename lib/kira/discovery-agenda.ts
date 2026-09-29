// discovery_agenda — the mandatory, one-time, first-conversation interview, pulled fresh every call.
//
// WHY THIS EXISTS. Kira ran TWO unconnected mechanisms for the same idea: `/discovery`, a separate
// page on a separate ElevenLabs agent, labelled "optional" on the dashboard; and `/talk`, the real
// per-person agent nobody ever routed into it. Folded into one agent per the operator's decision
// (2026-09-30): there is only ever one Kira, one memory, one tool set. Discovery is not a different
// product — it is what her early conversations are FOR, until the picture is complete.
//
// WHY A TOOL, NOT A BAKED-IN PROMPT FLAG. The ElevenLabs agent's system prompt is fixed at creation
// and only changes on an explicit re-provision (scripts/reprovision-*.mjs) — baking "discovery
// incomplete" into the static prompt text would mean the agent keeps opening every call as an
// interview forever unless someone remembers to re-patch her the day the client profile fills in.
// Exactly the trap `recall_memory`/`area_agenda` were built to avoid: the prompt instructs her to
// PULL live state via a tool call, never to trust a frozen string. This tool is that pull, and it
// never needs re-provisioning as discovery.completeness moves — the static instruction to call it is
// evergreen.
//
// MANDATORY, NOT OPTIONAL. Unlike area_agenda (an area she may or may not be asked about),
// discovery_agenda governs the OPENING of every business-journey call until complete=true — the
// static prompt tells her to call this first, always, and to run the interview rather than ordinary
// work while it says incomplete. This is a one-time gate, not a recurring "go deeper" feature.

import { createServiceClientV2 } from '@/lib/supabase/server';
import { resolveOrganisationForPerson } from '@/lib/auth';
import { DISCOVERY_STAGES } from './discovery-config';
import { ClientProfileSchema, DISCOVERY_COMPLETE_THRESHOLD, type ClientProfile } from './discovery-schema';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const uidFrom = (req: Request) => new URL(req.url).searchParams.get('uid') || '';

/**
 * Which ClientProfile field(s) satisfy each stage's `mustCover` label. Held as data, next to the
 * stages it describes, for the same reason checklist.ts's items are data: a stage's coverage
 * definition should be a config change, not a rebuild, when it turns out to ask the wrong thing.
 */
const STAGE_COVERAGE: Record<string, Array<{ label: string; check: (p: ClientProfile) => boolean }>> = {
  identity: [
    { label: 'name', check: (p) => !!p.identity?.name },
    { label: 'background', check: (p) => !!p.identity?.background_summary },
    { label: 'what matters to them', check: (p) => !!p.life_context },
  ],
  business: [
    { label: 'what the business does', check: (p) => !!p.business?.type || !!p.business?.description },
    { label: 'size/stage', check: (p) => !!p.business?.size || !!p.business?.stage },
    { label: 'how the day runs', check: (p) => !!p.role },
  ],
  how_they_work: [
    { label: 'decision style', check: (p) => !!p.working_style },
    { label: 'what they refuse to give up', check: (p) => (p.constraints?.length ?? 0) > 0 },
    { label: 'how they like to be kept in the loop', check: (p) => !!p.communication_preferences },
  ],
  people: [
    { label: 'key people, clients, who they trust', check: (p) => (p.key_relationships?.length ?? 0) > 0 },
  ],
  goals: [
    { label: 'near-term goals', check: (p) => (p.goals_near_term?.length ?? 0) > 0 },
    { label: 'long-term goals', check: (p) => (p.goals_long_term?.length ?? 0) > 0 },
    { label: 'current priorities', check: (p) => (p.current_priorities?.length ?? 0) > 0 },
  ],
  constraints: [
    { label: 'constraints', check: (p) => (p.constraints?.length ?? 0) > 0 },
    { label: 'pain points', check: (p) => (p.pain_points?.length ?? 0) > 0 },
  ],
};

export interface DiscoveryAgendaResult {
  ok: boolean;
  reason?: string;
  complete: boolean;
  completeness: number;
  sessions_count: number;
  ever_started: boolean;
  /** The first stage that still has an outstanding item — where to focus THIS turn. Null once complete. */
  stage: { id: string; goal: string; context: string } | null;
  /** Labels still missing in that stage. Ask ONE, same discipline as area_agenda. */
  outstanding: string[];
}

/**
 * GET/POST handler for `discovery_agenda`. Never throws, never returns a bare failure — same
 * contract as area_agenda: an `ok:false` carries a reason she is told to say verbatim.
 */
export async function handleDiscoveryAgenda(req: Request): Promise<Response> {
  const uid = uidFrom(req);
  if (!uid) return json(200, { ok: false, reason: 'I could not tell which account this is.', complete: true } as DiscoveryAgendaResult);

  const orgContext = await resolveOrganisationForPerson(uid);
  if (!orgContext) {
    // No org yet is not a discovery gap — provisioning handles that state. Never blocks on it.
    return json(200, { ok: false, reason: 'I could not identify which account this belongs to just now.', complete: true } as DiscoveryAgendaResult);
  }

  const supabase = createServiceClientV2();
  const { data, error } = await supabase
    .from('client_profiles')
    .select('profile, completeness, discovery_complete, sessions_count')
    .eq('organisation_id', orgContext.organisationId)
    .maybeSingle();

  if (error) {
    console.error('[discovery_agenda] read failed:', error);
    // Degrade, don't fake: an unreadable profile must never present as "discovery complete" — that
    // would silently skip the mandatory interview. It also must not block ordinary work on a real
    // outage, so it reports complete:true and lets the conversation proceed rather than stalling.
    return json(200, { ok: false, reason: 'I could not check where we are up to just now.', complete: true } as DiscoveryAgendaResult);
  }

  if (!data) {
    // Never started — the whole picture is outstanding. Point at the first stage.
    const first = DISCOVERY_STAGES[0];
    const result: DiscoveryAgendaResult = {
      ok: true,
      complete: false,
      completeness: 0,
      sessions_count: 0,
      ever_started: false,
      stage: { id: first.id, goal: first.goal, context: first.context },
      outstanding: (STAGE_COVERAGE[first.id] ?? []).map((c) => c.label),
    };
    return json(200, result);
  }

  const complete = Boolean(data.discovery_complete);
  if (complete) {
    return json(200, {
      ok: true,
      complete: true,
      completeness: Number(data.completeness ?? 1),
      sessions_count: Number(data.sessions_count ?? 0),
      ever_started: true,
      stage: null,
      outstanding: [],
    } as DiscoveryAgendaResult);
  }

  const profile = ClientProfileSchema.parse(data.profile ?? {});
  let stage: DiscoveryAgendaResult['stage'] = null;
  let outstanding: string[] = [];
  for (const s of DISCOVERY_STAGES) {
    const gaps = (STAGE_COVERAGE[s.id] ?? []).filter((c) => !c.check(profile)).map((c) => c.label);
    if (gaps.length > 0) {
      stage = { id: s.id, goal: s.goal, context: s.context };
      outstanding = gaps;
      break;
    }
  }

  // Every mustCover item is satisfied but the stored completeness fraction hasn't caught up yet
  // (KEY_FIELDS and STAGE_COVERAGE are deliberately separate lists — see the note on
  // DISCOVERY_COMPLETE_THRESHOLD below). Report complete rather than looping her on nothing.
  if (!stage) {
    return json(200, {
      ok: true,
      complete: true,
      completeness: Number(data.completeness ?? DISCOVERY_COMPLETE_THRESHOLD),
      sessions_count: Number(data.sessions_count ?? 0),
      ever_started: true,
      stage: null,
      outstanding: [],
    } as DiscoveryAgendaResult);
  }

  return json(200, {
    ok: true,
    complete: false,
    completeness: Number(data.completeness ?? 0),
    sessions_count: Number(data.sessions_count ?? 0),
    ever_started: true,
    stage,
    outstanding,
  } as DiscoveryAgendaResult);
}
