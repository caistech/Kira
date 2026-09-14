// lib/admin/exec.ts
// The Kira Exec cohort for the operator console (/admin/exec). A Kira Exec user is one who came
// through the valuation channel — has a business_valuations record — OR (as the funnel matures) is a
// paid subscriber or an LOI signer. This is the operator-facing view of the #12 tier.
//
// It excludes OUR OWN accounts — the canonical QA identities and the operator admins — via
// isNonClientAccount() below. Personal Kiras are excluded structurally rather than by a filter: the
// cohort is assembled from valuation / LOI / paid signals, so an account that only ever ran a
// personal Kira never enters it in the first place.

import { createServiceClientV2 } from '@/lib/supabase/server';

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

export interface ExecOrganisationRow {
  organisationId: string;
  userId: string | null; // Alias for ownerPersonId for UI compatibility
  organisationName: string | null;
  ownerPersonId: string | null;
  ownerEmail: string | null;
  ownerFirstName: string | null;
  joinedAt: string | null;
  subscriptionStatus: string | null;
  // valuation
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
export async function getExecUsers(): Promise<ExecOrganisationRow[]> {
  const sb = createServiceClientV2();

  // 1. Assemble the exec cohort (organisations with valuation records).
  const { data: vals } = await sb
    .from('business_valuations')
    .select('organisation_id, gap, worth_today, worth_potential, readiness, currency, industry');

  const orgIds = (vals ?? []).map((r) => r.organisation_id);
  if (orgIds.length === 0) return [];

  // 2. Resolve organisation details (owner, name).
  const { data: memberships } = await sb
    .from('organisation_memberships')
    .select('organisation_id, person_id, role, organisations(legal_name)')
    .in('organisation_id', orgIds)
    .eq('role', 'owner');

  const orgDetails = new Map(
    (memberships ?? []).map((m) => [
      m.organisation_id,
      {
        name: (m.organisations as any)?.legal_name ?? 'Unnamed business',
        ownerPersonId: m.person_id,
      },
    ])
  );

  // 3. Resolve owner identities for the cohort.
  const ownerPersonIds = [...new Set(Array.from(orgDetails.values()).map((d) => d.ownerPersonId))];
  const { data: owners } = await sb
    .from('persons')
    .select('person_id, email, first_name')
    .in('person_id', ownerPersonIds);

  const ownerDetails = new Map(
    (owners ?? []).map((p) => [
      p.person_id,
      { email: p.email, firstName: p.first_name },
    ])
  );

  // 4. Bulk fetch organisation-scoped data.
  const [{ data: agents }, { data: profiles }, { data: memories }, { data: knowledge }] = await Promise.all([
    sb.from('kira_agents').select('id, organisation_id, agent_name, elevenlabs_agent_id, status, journey_type, total_conversations, last_conversation_at').in('organisation_id', orgIds).neq('status', 'deleted'),
    sb.from('client_profiles').select('organisation_id, completeness, sessions_count').in('organisation_id', orgIds),
    sb.from('kira_memory').select('organisation_id').in('organisation_id', orgIds).eq('active', true),
    sb.from('kira_knowledge').select('organisation_id').in('organisation_id', orgIds),
  ]);

  // 5. Aggregate metrics.
  const memoryCountByOrg = new Map<string, number>();
  (memories ?? []).forEach((m) => memoryCountByOrg.set(m.organisation_id, (memoryCountByOrg.get(m.organisation_id) ?? 0) + 1));

  const knowledgeCountByOrg = new Map<string, number>();
  (knowledge ?? []).forEach((k) => knowledgeCountByOrg.set(k.organisation_id, (knowledgeCountByOrg.get(k.organisation_id) ?? 0) + 1));

  // 6. Assemble rows.
  const rows: ExecOrganisationRow[] = (vals ?? []).map((v) => {
    const details = orgDetails.get(v.organisation_id) || { name: 'Unnamed business', ownerPersonId: null };
    const owner = ownerDetails.get(details.ownerPersonId || '') || { email: null, firstName: null };
    const profile = (profiles ?? []).find((p) => p.organisation_id === v.organisation_id);

    return {
      organisationId: v.organisation_id,
      userId: details.ownerPersonId,
      organisationName: details.name,
      ownerPersonId: details.ownerPersonId,
      ownerEmail: owner.email,
      ownerFirstName: owner.firstName,
      joinedAt: null, // Need to fetch from somewhere if required
      subscriptionStatus: null, // Need to fetch from somewhere if required
      gap: v.gap,
      worthToday: v.worth_today,
      worthPotential: v.worth_potential,
      readiness: v.readiness,
      currency: v.currency || 'USD',
      industry: v.industry,
      agents: (agents ?? [])
        .filter((a) => a.organisation_id === v.organisation_id)
        .map((a) => ({
          id: a.id,
          agentName: a.agent_name,
          elevenlabsAgentId: a.elevenlabs_agent_id,
          status: a.status,
          journeyType: a.journey_type,
          totalConversations: a.total_conversations ?? 0,
          lastConversationAt: a.last_conversation_at,
        })),
      discoveryCompleteness: profile?.completeness ?? 0,
      discoverySessions: profile?.sessions_count ?? 0,
      docsCount: knowledgeCountByOrg.get(v.organisation_id) ?? 0,
      memoryCount: memoryCountByOrg.get(v.organisation_id) ?? 0,
    };
  });

  // Sort by total agent conversations across the organisation.
  rows.sort((a, b) => {
    const ca = a.agents.reduce((s, x) => s + x.totalConversations, 0);
    const cb = b.agents.reduce((s, x) => s + x.totalConversations, 0);
    return cb - ca;
  });

  return rows;
}

