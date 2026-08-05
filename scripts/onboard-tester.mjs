// scripts/onboard-tester.mjs
// Create a real, email-confirmed account for a named external tester.
//
// WHY A SCRIPT AND NOT THE DASHBOARD. Two rows have to agree — `auth.users` (the credential) and
// the app's own `users` row (everything else keys off its id, including kira_agents). Creating one
// without the other produces an account that signs in and then behaves as though it does not exist,
// which is a confusing failure to hand a person you have just asked to test something.
//
// DRY RUN BY DEFAULT. It reports what it would do and changes nothing until --apply.
//
//   node --env-file=.env.local scripts/onboard-tester.mjs --email x@y.com --first Simon --last Crisp
//   node --env-file=.env.local scripts/onboard-tester.mjs --email … --apply
//
// IDEMPOTENT: re-running against an existing account reports and repairs rather than duplicating.
// It deliberately does NOT set a password — the tester signs in with a magic link from the login
// page, which never expires the way a link pasted into an email does, and gives a broker on a
// locked-down corporate machine nothing to remember.

import { createClient } from '@supabase/supabase-js';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
}

const APPLY = process.argv.includes('--apply');
const email = (arg('email') || '').trim().toLowerCase();
const firstName = arg('first', '');
const lastName = arg('last', '');
if (!email) throw new Error('--email is required');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');

const sb = createClient(url, key, { auth: { persistSession: false } });

console.log(`[onboard-tester] ${APPLY ? 'APPLY' : 'DRY RUN'}  ${url}`);
console.log(`  email : ${email}`);
console.log(`  name  : ${firstName} ${lastName}`.trimEnd());

// ---- 1. auth.users -----------------------------------------------------------------------------
// listUsers is paginated; filter client-side rather than trusting a page to contain him.
let authUser = null;
for (let page = 1; page <= 20 && !authUser; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  authUser = (data?.users ?? []).find((u) => (u.email ?? '').toLowerCase() === email) ?? null;
  if ((data?.users ?? []).length < 200) break;
}
console.log(`  auth  : ${authUser ? `exists ${authUser.id} (confirmed: ${Boolean(authUser.email_confirmed_at)})` : 'ABSENT — will create'}`);

if (!authUser && APPLY) {
  // email_confirm: true — he never receives a "confirm your address" mail he then has to find. He
  // signs in with a magic link, which confirms nothing extra and asks nothing of him.
  const { data, error } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  authUser = data.user;
  console.log(`  auth  : created ${authUser.id}`);
}

// ---- 2. the app's own users row ----------------------------------------------------------------
const { data: existing, error: selErr } = await sb
  .from('users')
  .select('id, email, first_name, last_name, auth_user_id, subscription_status, created_at')
  .eq('email', email)
  .maybeSingle();
if (selErr) throw new Error(`select users: ${selErr.message}`);

console.log(
  `  app   : ${existing ? `exists ${existing.id} (auth_user_id: ${existing.auth_user_id ?? 'NULL — would not resolve'})` : 'ABSENT — will create'}`,
);

let appUser = existing;
if (APPLY) {
  if (!appUser) {
    const { data, error } = await sb
      .from('users')
      .insert({
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        auth_user_id: authUser?.id ?? null,
        subscription_status: 'trial',
      })
      .select('id, email, auth_user_id, subscription_status')
      .single();
    if (error) throw new Error(`insert users: ${error.message}`);
    appUser = data;
    console.log(`  app   : created ${appUser.id}`);
  } else if (!appUser.auth_user_id && authUser?.id) {
    // The bridge is the thing that silently breaks: he signs in, and every lookup keyed off the app
    // id finds nothing.
    const { error } = await sb.from('users').update({ auth_user_id: authUser.id }).eq('id', appUser.id);
    if (error) throw new Error(`bridge users.auth_user_id: ${error.message}`);
    console.log(`  app   : repaired auth_user_id -> ${authUser.id}`);
  }
}

// ---- 3. report what he will meet ---------------------------------------------------------------
if (appUser?.id) {
  const { data: identity } = await sb
    .from('business_identity')
    .select('legal_name, abn, street, locality, state, postcode')
    .eq('user_id', appUser.id)
    .maybeSingle();
  const complete =
    Boolean(identity?.legal_name?.trim()) &&
    /^\d{11}$/.test(identity?.abn || '') &&
    Boolean(identity?.street?.trim() && identity?.locality?.trim() && identity?.state?.trim() && identity?.postcode?.trim());
  console.log(`  ident : ${identity ? (complete ? 'complete' : 'partial — he lands on /setup/business') : 'none — he lands on /setup/business (expected)'}`);

  const { data: agents } = await sb
    .from('kira_agents')
    .select('id, journey_type, status, elevenlabs_agent_id')
    .eq('user_id', appUser.id);
  console.log(`  agent : ${(agents ?? []).length} row(s) — provisioned on first load, so 0 is expected before he signs in`);
}

if (!APPLY) console.log('\n[onboard-tester] dry run — re-run with --apply');
