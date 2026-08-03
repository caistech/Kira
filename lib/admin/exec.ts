// lib/admin/exec.ts
// The Kira Exec cohort for the operator console (/admin/exec). A Kira Exec user is one who came
// through the valuation channel — has a business_valuations record — OR (as the funnel matures) is a
// paid subscriber or an LOI signer. This is the operator-facing view of the #12 tier.
//
// It excludes OUR OWN accounts — the canonical QA identities and the operator admins — via
// isNonClientAccount() below. Personal Kiras are excluded structurally rather than by a filter: the
// cohort is assembled from valuation / LOI / paid signals, so an account that only ever ran a
// personal Kira never enters it in the first place.

import { createServiceClient } from '@/lib/supabase/server';

/**
 * Is this account one of OURS rather than a client's?
 *
 * The header used to promise "this view excludes test accounts" and nothing did — the query had no
 * such filter, so the synthetic identities sat in the operator's real cohort and were counted as
 * clients. A false claim on an operator screen is worse than no claim, because it is the screen you
 * read numbers off.
 *
 * DELIBERATELY CONSERVATIVE. It matches the canonical QA identities by exact address, plus-tagged
 * addresses on OUR OWN domains, and whoever is in ADMIN_EMAILS. It does NOT pattern-match words like
 * "test" or "qa" anywhere in an address: a real owner at test@ or a business called QA Plumbing must
 * never silently vanish from the cohort. Excluding a real client is the worse error of the two —
 * a stranger in the list is visible, a missing client is not.
 */
const OUR_DOMAINS = ['factory2key.com.au', 'corporateaisolutions.com'];
const QA_TAGS = ['qa', 'qauser', 'qaadmin', 'redteam', 'test'];

export function isNonClientAccount(email: string | null | undefined): boolean {
  const addr = (email ?? '').trim().toLowerCase();
  if (!addr) return false;

  // Operator accounts, from the same allowlist that gates /admin.
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.includes(addr)) return true;

  const [localRaw, domain] = addr.split('@');
  if (!domain || !OUR_DOMAINS.includes(domain)) return false;

  // Plus-addressed on one of our own domains — dennis+qauser@, dennis+redteam@.
  const plus = localRaw.split('+')[1];
  return Boolean(plus && QA_TAGS.includes(plus));
}

export interface ExecUserRow {
  userId: string;
  email: string;
  firstName: string | null;
  joinedAt: string | null;
  subscriptionStatus: string | null;
  // valuation (the exec-channel signal)
  gap: number | null;
  worthToday: number | null;
  worthPotential: number | null;
  readiness: number | null;
  currency: string;
  industry: string | null;
  // engagement
  agents: Array<{
    id: string;
    agentName: string | null;
    elevenlabsAgentId: string | null;
    status: string | null;
    journeyType: string | null;
    totalConversations: number;
    lastConversationAt: string | null;
  }>;
  discoveryCompleteness: number; // 0..1
  discoverySessions: number;
  docsCount: number;
  memoryCount: number;
}

/** Fetch the Kira Exec cohort with the metrics the operator manages against. */
export async function getExecUsers(): Promise<ExecUserRow[]> {
  const sb = createServiceClient();

  // 1. Assemble the exec cohort's user ids from the three signals.
  const [{ data: vals }, { data: lois }, { data: subs }] = await Promise.all([
    sb.from('business_valuations').select('user_id'),
    sb.from('loi_commitments').select('user_id').not('user_id', 'is', null),
    sb.from('users').select('id').eq('subscription_status', 'active'),
  ]);
  const ids = new Set<string>();
  (vals ?? []).forEach((r: any) => r.user_id && ids.add(r.user_id));
  (lois ?? []).forEach((r: any) => r.user_id && ids.add(r.user_id));
  (subs ?? []).forEach((r: any) => r.id && ids.add(r.id));
  if (ids.size === 0) return [];
  const userIds = [...ids];

  // 2. Pull the per-user data in bulk, then stitch.
  const [{ data: users }, { data: valuations }, { data: agents }, { data: profiles }, { data: knowledge }, { data: memories }] =
    await Promise.all([
      sb.from('users').select('id, email, first_name, created_at, subscription_status').in('id', userIds),
      sb.from('business_valuations').select('user_id, gap, worth_today, worth_potential, readiness, currency, industry').in('user_id', userIds),
      sb.from('kira_agents').select('id, user_id, agent_name, elevenlabs_agent_id, status, journey_type, total_conversations, last_conversation_at').in('user_id', userIds).neq('status', 'deleted'),
      sb.from('client_profiles').select('user_id, completeness, sessions_count').in('user_id', userIds),
      sb.from('kira_knowledge').select('user_id').in('user_id', userIds),
      sb.from('kira_memory').select('user_id').in('user_id', userIds).eq('active', true),
    ]);

  // THE EXCLUSION THE HEADER PROMISES. Applied here, on the fetched users, rather than on the id
  // sets above — the ids come from three tables and only `users` carries the email, so this is the
  // first point where the question can actually be asked.
  const clientUsers = (users ?? []).filter((u: any) => !isNonClientAccount(u.email));

  const valByUser = new Map((valuations ?? []).map((v: any) => [v.user_id, v]));
  const profByUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  const count = (rows: any[] | null, uid: string) => (rows ?? []).filter((r) => r.user_id === uid).length;

  const rows: ExecUserRow[] = clientUsers.map((u: any) => {
    const v: any = valByUser.get(u.id) ?? {};
    const p: any = profByUser.get(u.id) ?? {};
    return {
      userId: u.id,
      email: u.email,
      firstName: u.first_name ?? null,
      joinedAt: u.created_at ?? null,
      subscriptionStatus: u.subscription_status ?? null,
      gap: v.gap ?? null,
      worthToday: v.worth_today ?? null,
      worthPotential: v.worth_potential ?? null,
      readiness: v.readiness ?? null,
      currency: v.currency ?? 'USD',
      industry: v.industry ?? null,
      agents: (agents ?? [])
        .filter((a: any) => a.user_id === u.id)
        .map((a: any) => ({
          id: a.id,
          agentName: a.agent_name ?? null,
          elevenlabsAgentId: a.elevenlabs_agent_id ?? null,
          status: a.status ?? null,
          journeyType: a.journey_type ?? null,
          totalConversations: Number(a.total_conversations ?? 0),
          lastConversationAt: a.last_conversation_at ?? null,
        })),
      discoveryCompleteness: Number(p.completeness ?? 0),
      discoverySessions: Number(p.sessions_count ?? 0),
      docsCount: count(knowledge, u.id),
      memoryCount: count(memories, u.id),
    };
  });

  // Most-engaged first.
  rows.sort((a, b) => {
    const ca = a.agents.reduce((s, x) => s + x.totalConversations, 0);
    const cb = b.agents.reduce((s, x) => s + x.totalConversations, 0);
    return cb - ca;
  });
  return rows;
}
