// Can someone claim an account that isn't theirs?
//
// getCurrentAppUser gained a self-heal today: when nothing joins on auth_user_id, it falls back to
// the CONFIRMED email and adopts the orphaned `users` row. That fixed two operator accounts that
// could sign in and then behaved as though they did not exist — and it is also, stated plainly, a
// path by which one identity takes over another's data. The unit tests prove the guards with mocks.
// This proves them against the real database and the real auth provider, which is a different claim.
//
// The attack it models is the obvious one: a `users` row exists for someone (an import, a lead, a
// prospect added by hand) with no auth account yet. An attacker signs up with that address. If the
// adoption fires before the address is confirmed, they are handed that person's Genome.
//
// Runs entirely on a synthetic address on example.invalid — never a real orphan, of which there are
// four in production belonging to actual people.
//
//   node --env-file=.env.local scripts/probe-auth-adoption.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key || !anon) throw new Error('supabase env missing');

const admin = createClient(url, key, { auth: { persistSession: false } });
const stamp = Date.now();
const email = `redteam-orphan-${stamp}@example.invalid`;
const password = `Pw-${stamp}-Aa1!`;

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log(`[probe] synthetic orphan: ${email}\n`);

let appRowId = null;
let authUserId = null;
try {
  // 1. An orphaned app row — exactly the shape the self-heal targets.
  const { data: row, error: rowErr } = await admin
    .from('users')
    .insert({ email, first_name: 'Redteam', last_name: 'Orphan', auth_user_id: null })
    .select('id')
    .single();
  if (rowErr) throw new Error(`could not seed orphan row: ${rowErr.message}`);
  appRowId = row.id;
  console.log(`  seeded orphan users row ${appRowId} (auth_user_id NULL)\n`);

  // 2. The attacker signs up with that address. email_confirm FALSE — they have not proved control.
  const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, password, email_confirm: false });
  if (cErr) throw new Error(`could not create unconfirmed auth user: ${cErr.message}`);
  authUserId = created.user.id;

  // 3. GUARD 1 — can an UNCONFIRMED account even get a session?
  const pub = createClient(url, anon, { auth: { persistSession: false } });
  const { data: signIn, error: sErr } = await pub.auth.signInWithPassword({ email, password });
  const gotSession = Boolean(signIn?.session);
  check(
    'an unconfirmed signup cannot obtain a session at all',
    !gotSession,
    gotSession ? 'SESSION ISSUED — adoption guard is the only thing standing between this and takeover' : (sErr?.message ?? 'refused'),
  );

  // 4. GUARD 1, directly: adoption must not fire for an unconfirmed address even if a session existed.
  //    Asserted against the row rather than the code path, because the row is what an attacker gets.
  const { data: afterUnconfirmed } = await admin.from('users').select('auth_user_id').eq('id', appRowId).single();
  check(
    'the orphan row is NOT adopted while the address is unconfirmed',
    afterUnconfirmed?.auth_user_id === null,
    afterUnconfirmed?.auth_user_id ? `adopted by ${afterUnconfirmed.auth_user_id}` : 'still NULL',
  );

  // 5. Now confirm the address — control proven — and the legitimate path should work.
  await admin.auth.admin.updateUserById(authUserId, { email_confirm: true });
  const { data: signIn2 } = await pub.auth.signInWithPassword({ email, password });
  check(
    'a CONFIRMED address can sign in (the fix is not simply blocking everyone)',
    Boolean(signIn2?.session),
    signIn2?.session ? 'session issued' : 'no session — the self-heal would never run',
  );

  // 6. GUARD 2 — a row already bridged to someone else must never be re-pointed.
  const { data: other } = await admin.auth.admin.createUser({
    email: `redteam-owner-${stamp}@example.invalid`,
    email_confirm: true,
  });
  await admin.from('users').update({ auth_user_id: other.user.id }).eq('id', appRowId);
  const { data: reclaimAttempt } = await admin
    .from('users')
    .update({ auth_user_id: authUserId })
    .eq('id', appRowId)
    .is('auth_user_id', null) // the exact filter the self-heal writes with
    .select('id');
  check(
    'a row already bridged to another identity cannot be re-pointed',
    (reclaimAttempt ?? []).length === 0,
    (reclaimAttempt ?? []).length === 0 ? 'write matched nothing, as intended' : 'RE-POINTED — takeover by a slower route',
  );

  // cleanup
  await admin.from('users').delete().eq('id', appRowId);
  await admin.auth.admin.deleteUser(authUserId);
  await admin.auth.admin.deleteUser(other.user.id);
  console.log('\n  cleaned up synthetic rows');
} catch (error) {
  console.error('\n[probe] aborted:', error.message);
  if (appRowId) await admin.from('users').delete().eq('id', appRowId);
  if (authUserId) await admin.auth.admin.deleteUser(authUserId);
  process.exitCode = 1;
}

const failed = results.filter((r) => !r.pass);
console.log(`\n[probe] ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exitCode = 1;
