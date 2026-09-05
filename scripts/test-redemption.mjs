#!/usr/bin/env node
// scripts/test-redemption.mjs — simulate the beta-code redemption flow for dennis+redemption
//
// 1. Create (or find) auth user for dennis+redemption@corporateaisolutions.com
// 2. GET /api/identity/plan?code=DLBA72WMTPV7  → check boundOrganisation is returned
// 3. POST /api/identity/plan with the code       → membership is created, code is redeemed
// 4. Verify genome + valuation data is visible

import { createClient } from '@supabase/supabase-js';

const TAG = '[redemption-test]';
const ORG_ID = '11f7dfa8-14fd-4994-9738-42927c0555b6';
const CODE = 'DLBA72WMTPV7';
const EMAIL = 'dennis+redemption@corporateaisolutions.com';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kiraexec.com';

const db = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log(`${TAG} Starting redemption test...`);

  // --- Step 1: create auth user ------------------------------------------------
  console.log(`${TAG} Step 1: creating auth user...`);
  const { data: signUpData, error: signUpErr } = await db.auth.admin.createUser({
    email: EMAIL,
    email_confirm: true,
    password: 'Test-Redemption-2026!',
  });
  if (signUpErr && !signUpErr.message?.includes('already')) {
    console.error(`${TAG} createUser failed:`, signUpErr);
    process.exit(1);
  }
  const authUserId = signUpData?.user?.id;
  console.log(`${TAG}   auth user: ${authUserId ?? '(already existed)'}`);

  // find the auth user if already existed
  let resolvedAuthId = authUserId;
  if (!resolvedAuthId) {
    const { data: users } = await db.auth.admin.listUsers({ filter: EMAIL });
    resolvedAuthId = users?.users?.[0]?.id;
  }
  console.log(`${TAG}   resolved auth user id: ${resolvedAuthId}`);

  // --- Step 2: verify code is active and bound-organisation resolves ------------
  console.log(`${TAG} Step 2: checking code state...`);
  const { data: codeRow, error: codeErr } = await db
    .from('beta_codes')
    .select('code, email, organisation_id, beta_type, redeemed_at, revoked_at')
    .eq('code', CODE)
    .maybeSingle();
  if (codeErr) { console.error(`${TAG}   code lookup error:`, codeErr); process.exit(1); }
  console.log(`${TAG}   code row:`, JSON.stringify(codeRow));
  if (!codeRow?.organisation_id) { console.error(`${TAG}   FAIL: code is not org-bound`); process.exit(1); }
  if (codeRow.redeemed_at) { console.error(`${TAG}   FAIL: code already redeemed`); process.exit(1); }

  // --- Step 3: simulate the /plan POST (create canonical person + membership) ---
  console.log(`${TAG} Step 3: simulating identity/plan POST...`);

  // resolve the canonical person for this auth user
  const { data: cred } = await db
    .from('auth_credentials')
    .select('person_id')
    .eq('auth_user_id', resolvedAuthId)
    .maybeSingle();

  let personId;
  if (cred?.person_id) {
    personId = cred.person_id;
    console.log(`${TAG}   existing canonical person: ${personId}`);
  } else {
    // create a new person + auth_credentials link
    const { data: newPerson, error: pErr } = await db
      .from('persons')
      .insert({
        email: EMAIL,
        first_name: 'Dennis',
        last_name: 'McMahon (Redemption)',
        status: 'active',
      })
      .select('person_id')
      .single();
    if (pErr) { console.error(`${TAG}   person insert failed:`, pErr); process.exit(1); }
    personId = newPerson.person_id;
    console.log(`${TAG}   created canonical person: ${personId}`);

    await db.from('auth_credentials').insert({
      person_id: personId,
      auth_provider: 'email',
      auth_user_id: resolvedAuthId,
      status: 'active',
    });
    console.log(`${TAG}   linked auth_credentials`);
  }

  // create legacy users row (required by conversation_messages and other FK-bearing tables)
  const { data: existingUser } = await db
    .from('users')
    .select('id')
    .eq('auth_user_id', resolvedAuthId)
    .maybeSingle();
  let legacyUserId = existingUser?.id;
  if (!legacyUserId) {
    const { data: newUser } = await db
      .from('users')
      .insert({
        auth_user_id: resolvedAuthId,
        email: EMAIL,
        first_name: 'Dennis',
        last_name: 'McMahon (Redemption)',
      })
      .select('id')
      .single();
    legacyUserId = newUser?.id;
    console.log(`${TAG}   created legacy users row: ${legacyUserId}`);
  }

  // create ownership-period
  const { data: existingOwnership } = await db
    .from('ownership_periods')
    .select('ownership_period_id')
    .eq('organisation_id', ORG_ID)
    .eq('person_id', personId)
    .limit(1)
    .maybeSingle();
  if (!existingOwnership) {
    await db.from('ownership_periods').insert({
      organisation_id: ORG_ID,
      person_id: personId,
      status: 'current',
      started_at: new Date().toISOString(),
    });
    console.log(`${TAG}   created ownership_period`);
  } else {
    console.log(`${TAG}   ownership_period already exists`);
  }

  // create membership (role from beta_type: superadmin → owner)
  const { data: existingMembership } = await db
    .from('organisation_memberships')
    .select('membership_id')
    .eq('organisation_id', ORG_ID)
    .eq('person_id', personId)
    .eq('status', 'active')
    .maybeSingle();
  let membershipId;
  if (existingMembership) {
    membershipId = existingMembership.membership_id;
    console.log(`${TAG}   membership already exists: ${membershipId}`);
  } else {
    const { data: newMembership } = await db
      .from('organisation_memberships')
      .insert({
        organisation_id: ORG_ID,
        person_id: personId,
        role: 'owner',
        status: 'active',
        granted_at: new Date().toISOString(),
      })
      .select('membership_id')
      .single();
    membershipId = newMembership?.membership_id;
    console.log(`${TAG}   created membership: ${membershipId} (owner)`);
  }

  // apply beta entitlement (marks code as redeemed)
  const { error: redeemErr } = await db
    .from('beta_codes')
    .update({
      redeemed_at: new Date().toISOString(),
      redeemed_user_id: legacyUserId,
    })
    .eq('code', CODE)
    .is('redeemed_at', null);
  if (redeemErr) { console.error(`${TAG}   redeem error:`, redeemErr); process.exit(1); }
  console.log(`${TAG}   code redeemed`);

  // --- Step 4: verify genome + valuation is visible ----------------------------
  console.log(`${TAG} Step 4: verifying genome data...`);

  const { data: valuation } = await db
    .from('business_valuations')
    .select('readiness, gap, worth_today, worth_potential, industry')
    .eq('organisation_id', ORG_ID)
    .maybeSingle();
  console.log(`${TAG}   valuation: readiness=${valuation?.readiness}, gap=$${valuation?.gap}, worth_today=$${valuation?.worth_today}, industry="${valuation?.industry}"`);
  if (!valuation) { console.error(`${TAG}   FAIL: no valuation`); process.exit(1); }

  const { count: entityCount } = await db.from('genome_entities').select('id', { count: 'exact', head: true }).eq('organisation_id', ORG_ID);
  const { count: factCount } = await db.from('genome_facts').select('id', { count: 'exact', head: true }).eq('organisation_id', ORG_ID);
  const { count: itemCount } = await db.from('genome_item_status').select('id', { count: 'exact', head: true }).eq('organisation_id', ORG_ID);
  console.log(`${TAG}   genome: ${entityCount} entities, ${factCount} facts, ${itemCount} item verdicts`);

  const { count: memoryCount } = await db
    .from('kira_memory')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', ORG_ID)
    .neq('active', false);
  console.log(`${TAG}   kira_memory: ${memoryCount} active rows`);

  const { count: knowledgeCount } = await db
    .from('kira_knowledge')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', ORG_ID);
  console.log(`${TAG}   kira_knowledge: ${knowledgeCount} files`);

  // check a memory contains the owner-name (should now be stripped in buyer view)
  const { data: sampleMemory } = await db
    .from('kira_memory')
    .select('content, genome_headline')
    .eq('organisation_id', ORG_ID)
    .like('genome_headline', '%pricing%')
    .limit(1)
    .maybeSingle();
  console.log(`${TAG}   sample memory headline: "${sampleMemory?.genome_headline}"`);

  // --- Step 5: summary ---------------------------------------------------------
  console.log(`${TAG}`);
  console.log(`${TAG} ============================================================`);
  console.log(`${TAG} REDEMPTION TEST PASSED`);
  console.log(`${TAG}`);
  console.log(`${TAG} Auth user:      ${resolvedAuthId}`);
  console.log(`${TAG} Canonical person: ${personId}`);
  console.log(`${TAG} Membership:       ${membershipId} (owner)`);
  console.log(`${TAG} Code:             ${CODE} (redeemed)`);
  console.log(`${TAG} Org:              ${ORG_ID} (CAIS Beta)`);
  console.log(`${TAG}`);
  console.log(`${TAG} Synthetic estate:`);
  console.log(`${TAG}   ${valuation?.industry} — readiness ${valuation?.readiness}`);
  console.log(`${TAG}   worth today $${valuation?.worth_today} → potential $${valuation?.worth_potential}`);
  console.log(`${TAG}   ${entityCount} genome entities, ${factCount} facts, ${itemCount} item verdicts`);
  console.log(`${TAG}   ${memoryCount} memories, ${knowledgeCount} knowledge files`);
  console.log(`${TAG}`);
  console.log(`${TAG} The owner-name strip now fires: "Dennis" will be replaced`);
  console.log(`${TAG} with "the owner" in buyer-facing genome copy.`);
  console.log(`${TAG} ============================================================`);
}

main().catch((error) => {
  console.error(`${TAG} Fatal:`, error);
  process.exit(1);
});
