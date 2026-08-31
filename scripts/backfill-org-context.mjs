// scripts/backfill-org-context.mjs
//
// Backfill the canonical organisation identity chain for existing users.
//
// WHY: the P0.5/P2.4 org migration made `kira_agents.organisation_id` NOT NULL and gated all agent
// access behind the canonical chain `auth_credentials -> persons -> organisation_memberships ->
// organisations`. The migration seeded `organisations` from `users` at apply time, but users created
// AFTER that seed have no org context, and the chain tables can sit empty. With no org context,
// `getCurrentOrganisationContext()` returns null and NO agent can be created or accessed through the
// app — and scripts that provision agents (e.g. provision-redteam-identity.mjs) fail on the NOT NULL
// constraint.
//
// For every user lacking an org context this creates:
//   organisations                  (organisation_id = users.id  — matches the migration's UUID-reuse
//                                   convention in fix_missing_organisations.sql)
//   persons                        (person_id = users.id)
//   auth_credentials               (auth_user_id = the SUPABASE AUTH user id, NOT users.id)
//   organisation_memberships       (role = owner, active)
// and re-links any kira_agents rows owned by the user to that organisation_id.
//
// Idempotent: skips users who already have a complete org context; conflicts are no-ops.
//
// Usage:
//   node --env-file=.env.local scripts/backfill-org-context.mjs             # dry run
//   node --env-file=.env.local scripts/backfill-org-context.mjs --apply

import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const VERBOSE = process.argv.includes('--verbose');

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
}

const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const say = (msg) => console.log(msg);

/**
 * Resolve the canonical org context for an auth user id. Mirrors lib/auth getCurrentOrganisationContext
 * but takes the auth user id directly (server-side) instead of the session.
 */
async function resolveOrgContext(authUserId) {
  const { data: credential } = await db
    .from('auth_credentials')
    .select('person_id')
    .eq('auth_user_id', authUserId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (!credential) return null;

  const { data: membership } = await db
    .from('organisation_memberships')
    .select('membership_id, organisation_id, role, status')
    .eq('person_id', credential.person_id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const { data: org } = await db
    .from('organisations')
    .select('organisation_id')
    .eq('organisation_id', membership.organisation_id)
    .limit(1)
    .maybeSingle();
  if (!org) return null;

  return { personId: credential.person_id, organisationId: membership.organisation_id };
}

async function main() {
  const { data: users, error: usersError } = await db.from('users').select('*').order('created_at', { ascending: false });
  if (usersError) throw new Error(`read users: ${usersError.message}`);
  say(`Found ${users.length} users`);

  const authUsersByEmail = new Map();
  // Pull all auth identities so we can map users.email -> auth.users.id (auth_user_id).
  let page = null;
  for (let i = 0; i < 10; i++) {
    const { data, error } = await db.auth.admin.listUsers({ page: i + 1, perPage: 1000 });
    if (error) throw new Error(`list auth users: ${error.message}`);
    for (const u of data.users ?? []) authUsersByEmail.set(u.email?.toLowerCase(), u.id);
    if ((data.users ?? []).length < 1000) break;
  }
  say(`Loaded ${authUsersByEmail.size} auth identities`);

  let skipped = 0, created = 0, relinked = 0, noAuth = 0;

  for (const user of users) {
    const authUserId = authUsersByEmail.get(user.email?.toLowerCase());
    if (!authUserId) {
      say(`  [SKIP] ${user.email} — no matching Supabase auth identity`);
      noAuth++;
      continue;
    }

    const existing = await resolveOrgContext(authUserId);
    if (existing) {
      // Re-link any agents owned by this user that lack an organisation_id.
      if (APPLY) {
        const { data: agents, error: aErr } = await db
          .from('kira_agents')
          .select('id, organisation_id')
          .eq('user_id', user.id)
          .is('organisation_id', null);
        if (!aErr && agents?.length) {
          await db.from('kira_agents').update({ organisation_id: existing.organisationId }).eq('user_id', user.id).is('organisation_id', null);
          relinked += agents.length;
          if (VERBOSE) say(`  [LINK] ${user.email} — ${agents.length} orphaned agents -> org ${existing.organisationId.slice(0, 8)}`);
        }
      }
      skipped++;
      if (VERBOSE) say(`  [OK  ] ${user.email} — org context exists (${existing.organisationId.slice(0, 8)})`);
      continue;
    }

    const orgId = user.id; // UUID-reuse convention (matches fix_missing_organisations.sql)
    const personId = user.id;
    const displayName = [user.first_name ?? null, user.last_name ?? null].filter(Boolean).join(' ') || 'Unknown';
    const legalName = user.trading_name || displayName;

    if (!APPLY) {
      say(`  [DRY ] ${user.email} — would create org context (org=${orgId.slice(0, 8)})`);
      created++;
      continue;
    }

    // organisations
    const { error: orgErr } = await db.from('organisations').upsert(
      { organisation_id: orgId, legal_name: legalName, trading_name: user.trading_name, status: 'active' },
      { onConflict: 'organisation_id' }
    );
    if (orgErr) throw new Error(`create org for ${user.email}: ${orgErr.message}`);

    // persons
    const { error: personErr } = await db.from('persons').upsert(
      { person_id: personId, email: user.email, first_name: user.first_name, last_name: user.last_name, status: 'active' },
      { onConflict: 'person_id' }
    );
    if (personErr) throw new Error(`create person for ${user.email}: ${personErr.message}`);

    // auth_credentials — links the SUPABASE AUTH user id to the person
    const { data: existingCred } = await db
      .from('auth_credentials')
      .select('auth_credential_id')
      .eq('auth_provider', 'email')
      .eq('auth_user_id', authUserId)
      .limit(1)
      .maybeSingle();
    if (!existingCred) {
      const { error: credErr } = await db.from('auth_credentials').insert({
        person_id: personId,
        auth_provider: 'email',
        auth_user_id: authUserId,
        status: 'active',
      });
      if (credErr) throw new Error(`create auth_credential for ${user.email}: ${credErr.message}`);
    }

    // organisation_memberships (owner)
    const { error: memErr } = await db.from('organisation_memberships').upsert(
      { organisation_id: orgId, person_id: personId, role: 'owner', status: 'active', valid_from: new Date().toISOString() },
      { onConflict: 'organisation_id,person_id,role' }
    );
    if (memErr) throw new Error(`create membership for ${user.email}: ${memErr.message}`);

    // Re-link existing agents to the org
    const { data: agents, error: aErr } = await db
      .from('kira_agents')
      .select('id')
      .eq('user_id', user.id)
      .is('organisation_id', null);
    if (!aErr && agents?.length) {
      await db.from('kira_agents').update({ organisation_id: orgId }).eq('user_id', user.id).is('organisation_id', null);
      relinked += agents.length;
    }

    created++;
    say(`  [CREATE] ${user.email} — org context created (org=${orgId.slice(0, 8)})`);
  }

  say('');
  say(`Done. created=${created} skipped=${skipped} relinked=${relinked} no_auth_identity=${noAuth}`);
  if (!APPLY) say('Dry run — no writes. Re-run with --apply to create org context.');
  if (noAuth > 0) say(`NOTE: ${noAuth} user(s) had no matching auth identity and were not backfilled.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
