// lib/introducer/introducer.integration.test.ts
//
// The invite mechanics, against the real database.
//
// These are access-control claims, and access control that has only been reasoned about is access
// control that hasn't been tested. Each case here is a way a broker could get in when they
// shouldn't — a revoked link that still works, a suspended account that still resolves, a token
// stored in a form that turns a leaked table into a set of working logins.
//
// Skips (never fails) without credentials, so CI stays green; creates and deletes its own
// throwaway introducer.
//
// Run: npm test -- introducer.integration

import { createClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';

import { issueMagicLink, resolveMagicLink } from '@/lib/introducer';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.SUPABASE_SECRET_KEY ?? '';
const canRun = Boolean(url && key);

const EMAIL = `introducer-verify-${Date.now()}@example.invalid`;

describe.skipIf(!canRun)('introducer invite mechanics (live DB)', () => {
  // ⚠️ CONSTRUCTED ONLY WHEN IT CAN RUN. `describe.skipIf` skips the TESTS, not the collection —
  // vitest still evaluates this callback body, so an unconditional `createClient('', '')` threw
  // "supabaseUrl is required" and failed the whole FILE on any machine without credentials.
  //
  // The header of this file has claimed since it was written that it "skips (never fails) without
  // credentials, so CI stays green". That was the intent and the code defeated it, which nobody
  // noticed for one reason: the suite had never run in CI. The first run after `npm test` was added
  // to the gate turned this red, on an assertion nobody had made.
  const supabase = canRun
    ? createClient(url, key, { auth: { persistSession: false } })
    : (null as unknown as ReturnType<typeof createClient>);
  let introducerId = '';
  let token = '';

  afterAll(async () => {
    // Magic links cascade with the introducer row.
    if (introducerId) await supabase.from('introducers').delete().eq('id', introducerId);
  });

  it('issues a link that resolves and activates an invited introducer', async () => {
    const { data } = await supabase
      .from('introducers')
      .insert({ email: EMAIL, name: 'Verify Broker', referral_token: `tokverify${Date.now()}` })
      .select('id, status')
      .single();
    introducerId = data!.id;
    expect(data!.status).toBe('invited');

    const link = await issueMagicLink(introducerId);
    token = link.token;
    expect(link.url).toContain('/introducer/enter/');

    const resolved = await resolveMagicLink(token);
    expect(resolved?.id).toBe(introducerId);

    // First successful use flips invited → active, so the admin list distinguishes a broker who
    // has actually turned up from one who was merely emailed.
    const { data: after } = await supabase
      .from('introducers')
      .select('status')
      .eq('id', introducerId)
      .single();
    expect(after!.status).toBe('active');
  }, 30_000);

  it('stores the token only as a hash, so a leaked table is not a set of working logins', async () => {
    const { data } = await supabase
      .from('introducer_magic_links')
      .select('token_hash')
      .eq('introducer_id', introducerId);

    expect(data!.length).toBeGreaterThan(0);
    for (const row of data!) expect(row.token_hash).not.toBe(token);
  }, 30_000);

  it('refuses a revoked link', async () => {
    // This is what "Suspend" rests on: revocation has to bite immediately, not whenever the link
    // happens to expire on its own.
    await supabase
      .from('introducer_magic_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('introducer_id', introducerId);

    expect(await resolveMagicLink(token)).toBeNull();

    await supabase
      .from('introducer_magic_links')
      .update({ revoked_at: null })
      .eq('introducer_id', introducerId);
  }, 30_000);

  it('refuses a suspended introducer even holding a valid link', async () => {
    // Belt and braces against the revocation above: suspension has to stand on its own, so a link
    // issued before the suspension cannot be used after it.
    await supabase.from('introducers').update({ status: 'suspended' }).eq('id', introducerId);
    expect(await resolveMagicLink(token)).toBeNull();
  }, 30_000);

  it('refuses an unknown token', async () => {
    expect(await resolveMagicLink('not-a-real-token')).toBeNull();
  }, 30_000);
});
