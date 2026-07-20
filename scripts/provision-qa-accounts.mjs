// scripts/provision-qa-accounts.mjs
// Idempotent provisioning of the two STANDARD automated-tester identities (PRODUCT_STANDARDS §9.5,
// minimal set): the non-admin USER-agent and the ADMIN-agent. Human-operator admins
// (dennis@corporateaisolutions.com / mcmdennis@gmail.com) are used BY HAND and are not created here.
//
// Both are created email_confirm:true so they are immediately usable even though mailer_autoconfirm
// is OFF (a real confirmed account, never an auth bypass). Passwords come from env (the password
// manager / CI secrets) and are NEVER committed or printed. Re-running just resets the passwords.
//
// Usage:  node --env-file=.env.local scripts/provision-qa-accounts.mjs
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//           QA_TEST_ADMIN_EMAIL, QA_TEST_ADMIN_PASSWORD, QA_TEST_USER_EMAIL, QA_TEST_USER_PASSWORD
//
// After running: ensure ADMIN_EMAILS (Vercel + .env.local) CONTAINS QA_TEST_ADMIN_EMAIL and does
// NOT contain QA_TEST_USER_EMAIL (the §9.5 invariant; VT_B2 depends on it).

import { createClient } from '@supabase/supabase-js';

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  QA_TEST_ADMIN_EMAIL,
  QA_TEST_ADMIN_PASSWORD,
  QA_TEST_USER_EMAIL,
  QA_TEST_USER_PASSWORD,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
}

const accounts = [
  { role: 'user-agent', email: QA_TEST_USER_EMAIL, password: QA_TEST_USER_PASSWORD, admin: false },
  { role: 'admin-agent', email: QA_TEST_ADMIN_EMAIL, password: QA_TEST_ADMIN_PASSWORD, admin: true },
];
for (const a of accounts) {
  if (!a.email || !a.password) {
    throw new Error(`${a.role}: email/password env not set (QA_TEST_${a.admin ? 'ADMIN' : 'USER'}_EMAIL/PASSWORD)`);
  }
}

const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Find an existing auth user by email (paginated — the admin API has no direct email filter). */
async function findAuthUserByEmail(email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

for (const a of accounts) {
  const existing = await findAuthUserByEmail(a.email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: a.password,
      email_confirm: true,
    });
    if (error) throw new Error(`${a.role}: update failed — ${error.message}`);
    console.log(`  ✓ ${a.role} (${a.email}) — password reset, confirmed`);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email: a.email,
      password: a.password,
      email_confirm: true,
      user_metadata: { first_name: 'QA', name: a.role },
    });
    if (error) throw new Error(`${a.role}: create failed — ${error.message}`);
    console.log(`  ✓ ${a.role} (${a.email}) — created + confirmed`);
  }
}

console.log('\nDone. Reminder: ADMIN_EMAILS must CONTAIN QA_TEST_ADMIN_EMAIL and NOT QA_TEST_USER_EMAIL.');
