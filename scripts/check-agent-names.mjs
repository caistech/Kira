#!/usr/bin/env node
//
// WHOSE NAME IS SHE USING? — a report, not a repair.
//
// The owner's name is baked into the agent's system prompt at provision time and appears there a
// dozen times ("You are Kira, a thinking partner for X", "**Name:** X Y"). Nothing reconciles it
// afterwards, so it is frozen at whatever it was on day one. If it was wrong then — or he corrects
// it in Settings — she keeps using the stale one, confidently, forever.
//
// A naive tester opened his first conversation and was greeted "Hey Andrew." He is not Andrew. His
// reaction is why this is not cosmetic: "if she's wrong about the one thing she should certainly
// know, what's she wrong about that I can't check?"
//
// ⚠️ WHY THIS ONLY REPORTS. The obvious fix — trust the account and override the prompt — was
// written, and the data killed it. Measured across the live fleet: 5 of 12 agents disagree, and in
// TWO of those the PROMPT is the correct one. `Kira_Trinh_*` has "Trinh" baked against an account
// reading "Dennis"; Shah's has "Shah" against "shhahhussain". Shipping the override would have
// started calling Trinh "Dennis" and Shah by a mangled login.
//
// There is no field here that is reliably right, so a machine cannot resolve it — and a repair that
// is wrong 40% of the time is worse than the drift it fixes. What a human needs is the list.
//
//   node --env-file=.env.local scripts/check-agent-names.mjs

import { createClient } from '@supabase/supabase-js';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY } = process.env;
for (const [name, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY })) {
  if (!value) throw new Error(`${name} is not set`);
}

const db = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A login-derived string is not a name. Flagged separately: the ACCOUNT is what needs fixing. */
function looksLikeALogin(value) {
  return /[@+._]/.test(value) || (value.length > 12 && !/\s/.test(value));
}

const { data: agents } = await db
  .from('kira_agents')
  .select('elevenlabs_agent_id, agent_name, user_id')
  .eq('journey_type', 'business')
  .in('status', ['active', 'paused']);

const rows = [];
for (const agent of agents ?? []) {
  if (!agent.elevenlabs_agent_id) continue;
  const { data: user } = await db
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', agent.user_id)
    .maybeSingle();
  if (!user) continue;

  let prompt = '';
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agent.elevenlabs_agent_id}`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });
    prompt = (await res.json())?.conversation_config?.agent?.prompt?.prompt || '';
  } catch {
    // An agent we cannot read is reported as unknown rather than skipped: silence here would look
    // identical to agreement, which is the failure mode this whole file exists to avoid.
    rows.push({ agent: agent.agent_name, baked: '(could not read)', account: user.first_name ?? '', flag: '?' });
    continue;
  }

  const match = prompt.match(/\*\*Name:\*\*\s*([^\n]{2,60})/);
  if (!match) continue;
  const baked = match[1].trim();
  const account = String(user.first_name ?? '').trim();
  const agrees = account && baked.toLowerCase().startsWith(account.toLowerCase().split(' ')[0]);
  if (agrees) continue;

  rows.push({
    agent: agent.agent_name,
    baked,
    account: account || '(none)',
    email: user.email,
    // Which side looks wrong, stated rather than guessed at, so the person reading has somewhere to
    // start. Never acted on.
    flag: looksLikeALogin(account) ? 'account looks login-derived' : 'genuine disagreement',
  });
}

if (rows.length === 0) {
  console.log('Every agent greets its owner by the name on the account.');
  process.exit(0);
}

console.log(`\n${rows.length} agent(s) greet their owner by a name the account does not carry:\n`);
for (const r of rows) {
  console.log(`  ${r.agent}`);
  console.log(`    she says   : ${r.baked}`);
  console.log(`    account has: ${r.account}${r.email ? `  (${r.email})` : ''}`);
  console.log(`    ${r.flag}\n`);
}
console.log('Neither side is automatically right — see the header. Fix the one that is wrong, then');
console.log('re-provision that agent so the prompt is rebuilt from the corrected account.\n');
// Exit 0: this is a report for a person, not a gate. Failing CI on a name nobody has decided yet
// would train someone to switch it off.
