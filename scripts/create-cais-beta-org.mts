// scripts/create-cais-beta-org.mts
//
// Creates the CAIS Beta organisation end-to-end, mirroring the canonical identity
// chain that /api/identity/plan establishes (persons → auth_credentials →
// organisations → organisation_memberships → ownership_periods). Authorised by
// the repo owner 2026-09-05. Safe to re-run: every step is idempotent (lookup
// before insert, on-conflict tolerant where the schema allows).
//
// Created objects:
//   organisations            legal_name 'CAIS Beta'  (no ABN — not a registered company)
//   persons                  dennis@corporateaisolutions.com, Dennis McMahon
//   auth_credentials         links the person to the confirmed auth user
//   organisation_memberships owner  + admin  (two rows — role is part of the unique key)
//   ownership_periods        current ownership for Dennis
//
// Usage: npx tsx scripts/create-cais-beta-org.mts

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const ORG = {
  legal_name: 'CAIS Beta',
  trading_name: 'CAIS Beta',
  abn: null,
  entity_type: 'unknown',
  status: 'active',
  street: '76-84 Brunswick Street',
  locality: 'Fortitude Valley',
  state: 'QLD',
  postcode: '4006',
  country: 'AU',
};

const OWNER = {
  email: 'dennis@corporateaisolutions.com', // org + owner email
  authUserId: '0adbd5a8-6a14-4df8-8983-791bf7cbc20e', // verified existing confirmed auth user
  firstName: 'Dennis',
  lastName: 'McMahon',
};

async function main() {
  const { createClient } = await import('@supabase/supabase-js');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const svc = createClient(url, key, { auth: { persistSession: false } });

  // -------------------------------------------------------------------------
  // 1. PERSON (canonical identity, independent of org membership)
  // -------------------------------------------------------------------------
  let personId: string;
  const { data: existingPerson } = await svc
    .from('persons')
    .select('person_id')
    .eq('email', OWNER.email)
    .maybeSingle();

  if (existingPerson) {
    personId = existingPerson.person_id as string;
    console.log('person exists:', personId);
  } else {
    const { data: person, error: personErr } = await svc
      .from('persons')
      .insert({
        email: OWNER.email,
        first_name: OWNER.firstName,
        last_name: OWNER.lastName,
      })
      .select('person_id')
      .single();
    if (personErr || !person) {
      throw new Error(`person create failed: ${personErr?.message ?? 'no row'}`);
    }
    personId = person.person_id as string;
    console.log('person created:', personId);
  }

  // -------------------------------------------------------------------------
  // 2. AUTH CREDENTIAL (links the confirmed auth user to this person)
  // -------------------------------------------------------------------------
  const { data: existingAuth } = await svc
    .from('auth_credentials')
    .select('auth_credential_id')
    .eq('auth_provider', 'email')
    .eq('auth_user_id', OWNER.authUserId)
    .limit(1)
    .maybeSingle();
  if (!existingAuth) {
    const { error: authErr } = await svc.from('auth_credentials').insert({
      person_id: personId,
      auth_provider: 'email',
      auth_user_id: OWNER.authUserId,
      status: 'active',
    });
    if (authErr) {
      throw new Error(`auth_credential create failed: ${authErr.message}`);
    }
    console.log('auth_credential created');
  } else {
    console.log('auth_credential exists');
  }

  // -------------------------------------------------------------------------
  // 3. ORGANISATION
  // -------------------------------------------------------------------------
  let orgId: string;
  const { data: existingOrg } = await svc
    .from('organisations')
    .select('organisation_id')
    .eq('legal_name', ORG.legal_name)
    .limit(1)
    .maybeSingle();
  if (existingOrg) {
    orgId = existingOrg.organisation_id as string;
    console.log('org exists:', orgId);
  } else {
    const { data: org, error: orgErr } = await svc
      .from('organisations')
      .insert(ORG)
      .select('organisation_id')
      .single();
    if (orgErr || !org) {
      throw new Error(`org create failed: ${orgErr?.message ?? 'no row'}`);
    }
    orgId = org.organisation_id as string;
    console.log('org created:', orgId);
  }

  // -------------------------------------------------------------------------
  // 4. MEMBERSHIPS — owner AND admin (role is part of the unique key)
  // -------------------------------------------------------------------------
  for (const role of ['owner', 'admin'] as const) {
    const { data: existingMembership } = await svc
      .from('organisation_memberships')
      .select('membership_id')
      .eq('organisation_id', orgId)
      .eq('person_id', personId)
      .eq('role', role)
      .limit(1)
      .maybeSingle();
    if (existingMembership) {
      console.log(`membership (${role}) exists`);
      continue;
    }
    const { error: memErr } = await svc.from('organisation_memberships').insert({
      organisation_id: orgId,
      person_id: personId,
      role,
      status: 'active',
      valid_from: new Date().toISOString(),
    });
    if (memErr) {
      throw new Error(`membership (${role}) create failed: ${memErr.message}`);
    }
    console.log(`membership (${role}) created`);
  }

  // -------------------------------------------------------------------------
  // 5. OWNERSHIP (temporal — only one current period per org)
  // -------------------------------------------------------------------------
  const { data: existingOwnership } = await svc
    .from('ownership_periods')
    .select('ownership_period_id')
    .eq('organisation_id', orgId)
    .eq('status', 'current')
    .limit(1)
    .maybeSingle();
  if (existingOwnership) {
    console.log('ownership exists');
    return;
  }
  const { error: ownErr } = await svc.from('ownership_periods').insert({
    organisation_id: orgId,
    person_id: personId,
    status: 'current',
    valid_from: new Date().toISOString(),
  });
  if (ownErr) {
    throw new Error(`ownership create failed: ${ownErr.message}`);
  }
  console.log('ownership created');

  console.log('\nDONE. CAIS Beta org id:', orgId);
}

main().catch((err) => {
  console.error('[create-cais-beta-org] FAILED:', err);
  process.exit(1);
});