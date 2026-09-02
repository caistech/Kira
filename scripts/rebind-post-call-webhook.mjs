// scripts/rebind-post-call-webhook.mjs
//
// Re-mint the workspace post-call webhook secret and re-bind every Kira agent to it.
//
// WHY THIS EXISTS — the outage it was written for, 2026-08-15 → 18.
//
// The post-call webhook is signed with a workspace-level HMAC secret that ElevenLabs returns
// exactly ONCE, at creation, and masks on every later GET. On 2026-08-18 at 09:43:06 local a
// session created a second Kira webhook — the product had moved from the Vercel default host to
// kiraexec.com — rebound 16 agents to it, and died 29 seconds later (.git/index.lock, 09:43:35)
// without writing the new secret anywhere. Production kept the old secret, so every post-call
// delivery arrived signed with something it could not verify.
//
// Measured, not inferred: the operator's calls at 02:19:44Z and 02:22:05Z on 18 Aug (48s/8msg and
// 129s/16msg) produced NO conversation row and no memory, and the webhook logged
// `401 @ 2026-08-18T02:24:19Z` — its first failure, two minutes after the call ended.
//
// ⚠️ THE SHAPE WORTH REMEMBERING: none of this is visible from outside. The route answers 405 to a
// GET and 401 to an unsigned POST — exactly as a healthy guarded endpoint should — so every
// reachability check passes over it while nothing is being written. Only comparing what ElevenLabs
// recorded against what our database received exposes it.
//
// An unrecoverable secret can only be replaced. So this deletes EVERY workspace webhook pointing at
// a Kira post-call URL (both hosts — a survivor on the old host carries its own secret and would
// fail the same way), creates a fresh one through the package's own `bindWorkspaceWebhook` rather
// than a local fork, re-binds every agent in `kira_agents`, and PERSISTS the secret to .env.local
// and Vercel in the same run — because a secret that has to be copied by hand is a secret that gets
// dropped again, which is precisely how this outage happened.
//
// It never prints the secret. It reports a fingerprint so the two copies can be compared.
//
// DRY BY DEFAULT. It deletes live webhooks and rebinds a live fleet, so it does nothing without
// --apply. This is deliberately the opposite of reprovision-kira-agents.mjs, which mutates 13 live
// agents with no flag at all and has been flagged for it.
//
//   node --env-file=.env.local scripts/rebind-post-call-webhook.mjs          # show the plan
//   node --env-file=.env.local scripts/rebind-post-call-webhook.mjs --apply  # do it
//
// AFTER --apply YOU MUST REDEPLOY. Vercel injects env at deploy time; the running functions keep
// the old secret until a new deployment goes out. Then make one real call and confirm a
// conversation row appears WITH distilled_at set — a row alone only proves half the loop.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';
import { bindWorkspaceWebhook } from '@caistech/elevenlabs-convai';

const WORKSPACE_WEBHOOKS = 'https://api.elevenlabs.io/v1/workspace/webhooks';
const CONVAI = 'https://api.elevenlabs.io/v1/convai';

const APPLY = process.argv.includes('--apply');
const apiKey = process.env.ELEVENLABS_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

// The CANONICAL host, stated here rather than read from NEXT_PUBLIC_APP_URL. That variable still
// carries the Vercel default in places and .env.local has been stale before; binding the webhook to
// whichever host happened to be in the environment is the class of mistake this script exists to
// repair. Override deliberately with KIRA_WEBHOOK_HOST if the domain ever moves again.
const HOST = (process.env.KIRA_WEBHOOK_HOST || 'https://kiraexec.com').replace(/\/$/, '');
const WEBHOOK_URL = `${HOST}/api/kira/webhook`;
const WEBHOOK_NAME = 'Kira post-call';

// Both hosts serve the same deployment, so a webhook on either is a live delivery target. Matching
// on the PATH rather than the full URL is what makes the old-host duplicate visible to the cleanup.
const isKiraPostCall = (u) => /\/api\/kira\/webhook$/.test(u ?? '');

const VERCEL_PROJECT = 'prj_itVurDE9CD77K9rGWEQZNDmn33yz';
const VERCEL_TEAM = 'team_hwN7IFtd2Fo3DCj9C67ZwI1t';

if (!apiKey || !supabaseUrl || !supabaseKey) {
  console.error('Need ELEVENLABS_API_KEY, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.');
  console.error('Run with --env-file=.env.local');
  process.exit(1);
}
if (HOST.includes('localhost') || HOST.includes('127.0.0.1')) {
  console.error(`Host is local (${HOST}). ElevenLabs calls this URL from its own infrastructure, so`);
  console.error('a localhost webhook produces one that can never fire.');
  process.exit(1);
}

const el = (path, init = {}) =>
  fetch(path, { ...init, headers: { 'xi-api-key': apiKey, ...(init.headers || {}) } });

/** Short, non-reversible marker so two copies of a secret can be compared without printing one. */
const fingerprint = (v) => `${createHash('sha256').update(v).digest('hex').slice(0, 8)} (len ${v.length})`;

console.log(`${APPLY ? 'APPLYING' : 'DRY RUN (no --apply, nothing will change)'}`);
console.log(`Target webhook URL: ${WEBHOOK_URL}\n`);

// ── 0. The fleet, from OUR table rather than from a name prefix ──────────────
// kira_agents is the authoritative list of agents this product owns. The workspace holds ~212
// agents across eleven products; a name-prefix match would be a guess, and binding another
// product's agent to our webhook is the kind of cross-product damage the shared workspace makes
// easy. The table is the boundary.

const db = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
const { data: rows, error } = await db
  .from('kira_agents')
  .select('elevenlabs_agent_id, user_id')
  .order('created_at');
if (error) {
  console.error('Could not read kira_agents:', error.message);
  process.exit(1);
}
const owned = (rows ?? []).map((r) => r.elevenlabs_agent_id).filter(Boolean);
if (owned.length === 0) {
  console.error('No agents in kira_agents. Aborting rather than creating an unbound webhook whose');
  console.error('secret would be stale the moment it was minted.');
  process.exit(1);
}
console.log(`Agents in kira_agents: ${owned.length}`);

// ── 1. What is out there now ─────────────────────────────────────────────────

const listRes = await el(`${WORKSPACE_WEBHOOKS}?include_usages=true`);
if (!listRes.ok) {
  console.error(`Could not list workspace webhooks: ${listRes.status} ${await listRes.text()}`);
  process.exit(1);
}
const { webhooks = [] } = await listRes.json();
const stale = webhooks.filter((w) => isKiraPostCall(w.webhook_url));

console.log(`Kira post-call webhooks currently in the workspace: ${stale.length}`);
for (const w of stale) {
  const fail = w.most_recent_failure_error_code
    ? `last failure ${w.most_recent_failure_error_code} @ ${new Date(w.most_recent_failure_timestamp * 1000).toISOString()}`
    : 'no recorded failure';
  console.log(`  ${w.webhook_id}  ${w.webhook_url}`);
  console.log(`      ${w.name} · bound to ${(w.usage ?? []).length} · ${fail}`);
}

// ── 1b. THE REFERENCE SET IS COMPLETE OR THIS DOES NOT WORK ──────────────────
//
// kira_agents is the list of agents belonging to OWNERS. It is not the list of agents bound to a
// Kira webhook, and the difference cost a full failed run on 2026-08-18: all 18 owner agents
// unbound cleanly, and the delete still came back
//   405 {"status":"webhook_in_use","message":"This webhook is still in use and cannot be deleted"}
// because `Kira Guide Setup Agent` — the PUBLIC landing agent, provisioned outside kira_agents and
// therefore invisible to the table — was still pointing at it. It is also the agent behind the
// old webhook's 500 @ 18:06:28, so it was not incidental: it was the one still delivering.
//
// The `usage` array on a webhook gives a COUNT and no ids, so the only way to learn WHICH agents
// reference it is to read every agent in the workspace. That is ~220 GETs and takes a couple of
// minutes; the alternative is another 405 halfway through a destructive sequence, having already
// unbound the fleet. A partial reference set is wrong in exactly the direction that breaks things.
//
// Scanning also protects the other ten products sharing this workspace: anything bound to a KIRA
// post-call URL is ours by definition, and nothing else is touched.

const staleIds = new Set(stale.map((w) => w.webhook_id));
const seen = new Set(owned);
const extra = [];

process.stdout.write('Scanning the workspace for other agents bound to these webhooks… ');
let cursor = null;
const workspace = [];
for (let page = 0; page < 20; page++) {
  const res = await el(`${CONVAI}/agents?page_size=100${cursor ? `&cursor=${cursor}` : ''}`);
  if (!res.ok) {
    console.error(`\nCould not list agents: ${res.status}. Aborting — an incomplete reference set`);
    console.error('would leave a binding behind and fail the delete after unbinding the fleet.');
    process.exit(1);
  }
  const j = await res.json();
  workspace.push(...(j.agents ?? []));
  if (!j.has_more || !j.next_cursor) break;
  cursor = j.next_cursor;
}
for (const a of workspace) {
  if (seen.has(a.agent_id)) continue;
  const res = await el(`${CONVAI}/agents/${a.agent_id}`);
  if (!res.ok) {
    console.error(`\nCould not read agent ${a.agent_id} (${res.status}). Aborting: an unreadable`);
    console.error('agent may hold a binding, and proceeding would fail the delete.');
    process.exit(1);
  }
  const d = await res.json();
  const ws = d.platform_settings?.workspace_overrides?.webhooks ?? d.platform_settings?.webhooks ?? {};
  if (ws.post_call_webhook_id && staleIds.has(ws.post_call_webhook_id)) {
    extra.push({ id: a.agent_id, name: a.name ?? '(unnamed)' });
  }
}
console.log(`${workspace.length} scanned`);
if (extra.length) {
  console.log(`  ⚠️  ${extra.length} bound agent(s) NOT in kira_agents — included in the rebind:`);
  for (const e of extra) console.log(`      ${e.id}  ${e.name}`);
}

const ourAgents = [...owned.map((id) => ({ elevenlabs_agent_id: id })), ...extra.map((e) => ({ elevenlabs_agent_id: e.id }))];
console.log(`Fleet to rebind: ${ourAgents.length}`);

if (!APPLY) {
  console.log('\nPlan:');
  console.log(`  1. unbind ${ourAgents.length} agents`);
  console.log(`  2. delete ${stale.length} webhook(s) above`);
  console.log(`  3. create "${WEBHOOK_NAME}" at ${WEBHOOK_URL}, capturing the secret`);
  console.log(`  4. bind all ${ourAgents.length} agents to it`);
  console.log('  5. write the secret to .env.local and Vercel (sensitive, production+preview)');
  console.log('\nThen REDEPLOY, then make one call and check for a row WITH distilled_at.');
  console.log('\nRe-run with --apply to do it.');
  process.exit(0);
}

// ── 2. Unbind, so the delete is permitted ────────────────────────────────────
// ElevenLabs refuses to delete a webhook an agent still points at ("webhook_in_use"), so the order
// is forced: release, delete, create, re-bind. Post-call payloads do not fire in that window —
// acceptable at seconds long, and they are not firing usefully today anyway.

const setBinding = (agentId, webhookId) =>
  el(`${CONVAI}/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      platform_settings: {
        workspace_overrides: {
          webhooks: webhookId
            ? { post_call_webhook_id: webhookId, events: ['transcript'], transcript_format: 'json' }
            : { post_call_webhook_id: null },
        },
      },
    }),
  });

console.log('\nUnbinding:');
for (const a of ourAgents) {
  const res = await setBinding(a.elevenlabs_agent_id, null);
  console.log(`  ${res.ok ? 'unbound' : `UNBIND FAILED (${res.status})`} ${a.elevenlabs_agent_id}`);
  if (!res.ok) {
    console.error('   ', (await res.text()).slice(0, 200));
    process.exit(1);
  }
}

// ── 3. Delete every Kira post-call webhook, on either host ───────────────────
// Stopping on a failed delete is deliberate. Creating a replacement while a stale duplicate
// survives is how the workspace ended up with two in the first place.

console.log('\nDeleting:');
for (const w of stale) {
  const del = await el(`${WORKSPACE_WEBHOOKS}/${w.webhook_id}`, { method: 'DELETE' });
  console.log(`  ${del.ok ? 'deleted' : `DELETE FAILED (${del.status})`} ${w.webhook_id}  ${w.webhook_url}`);
  if (!del.ok) {
    console.error('   ', (await del.text()).slice(0, 200));
    console.error('    Stopping: a surviving duplicate carries its own secret, and rebinding to a');
    console.error('    fresh webhook while it lives recreates exactly the split being repaired.');
    process.exit(1);
  }
}

// ── 4. Create + bind the first agent — this is the one moment the secret exists ──

const [first, ...rest] = ourAgents;
const { webhookId, webhookSecret } = await bindWorkspaceWebhook(apiKey, first.elevenlabs_agent_id, {
  url: WEBHOOK_URL,
  name: WEBHOOK_NAME,
});

if (!webhookSecret) {
  console.error('\nNo secret returned — a webhook with this URL still existed and was REUSED, so the');
  console.error('secret stayed masked. Delete it in the ElevenLabs dashboard and re-run; storing');
  console.error('nothing is correct here, because a secret we cannot read is one we cannot verify.');
  process.exit(1);
}
console.log(`\n  bound ${first.elevenlabs_agent_id}`);

for (const a of rest) {
  const res = await setBinding(a.elevenlabs_agent_id, webhookId);
  console.log(`  ${res.ok ? 'bound  ' : `BIND FAILED (${res.status})`} ${a.elevenlabs_agent_id}`);
}

console.log(`\nNew webhook ${webhookId}`);
console.log(`Secret fingerprint ${fingerprint(webhookSecret)}`);

// ── 5. Persist — the step whose absence caused the whole outage ──────────────

const envPath = join(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  const contents = readFileSync(envPath, 'utf8');
  const line = `ELEVENLABS_WEBHOOK_SECRET=${webhookSecret}`;
  writeFileSync(
    envPath,
    /^ELEVENLABS_WEBHOOK_SECRET=.*$/m.test(contents)
      ? contents.replace(/^ELEVENLABS_WEBHOOK_SECRET=.*$/m, line)
      : `${contents.replace(/\s*$/, '')}\n${line}\n`,
  );
  console.log('Wrote ELEVENLABS_WEBHOOK_SECRET to .env.local');
}

// Pushed through the authenticated Vercel CLI rather than the REST API: there is no readable token
// on this machine (~/.vercel-token absent, VERCEL_TOKEN unset, and the CLI keeps no token in
// auth.json), but `vercel whoami` resolves. The value goes over STDIN, never --value, so it cannot
// land in a process listing or shell history.
function vercelEnv(target) {
  const args = ['env', 'add', 'ELEVENLABS_WEBHOOK_SECRET', target, '--sensitive', '--force',
    '--scope', VERCEL_TEAM, '--project', VERCEL_PROJECT, '--yes'];
  const res = spawnSync('vercel', args, { input: webhookSecret, encoding: 'utf8', shell: true });
  const ok = res.status === 0;
  console.log(`  ${ok ? 'pushed' : `FAILED (${res.status})`} → ${target}`);
  if (!ok) console.error('   ', (res.stderr || res.stdout || '').trim().slice(0, 400));
  return ok;
}

console.log('\nPushing to Vercel (sensitive, production+preview):');
const pushed = ['production', 'preview'].map(vercelEnv).every(Boolean);

console.log(
  pushed
    ? '\n⚠️  NOT DONE YET — REDEPLOY. Vercel injects env at deploy time, so the running functions\n' +
        '    still hold the old secret and every delivery will keep 401ing until a new deployment.\n' +
        '    Then make one call and confirm a conversations row appears WITH distilled_at set.'
    : '\n⚠️  Vercel push failed. The secret is in .env.local — set it in Vercel by hand\n' +
        '    (sensitive, production+preview) and redeploy. Do not lose it: it cannot be re-read.',
);
