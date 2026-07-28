#!/usr/bin/env node
//
// Rotate KIRA_TOOL_WEBHOOK_SECRET in one sequence, with the shortest possible window.
//
// THE PROBLEM THIS SOLVES. The secret lives in two places that cannot change at the same instant:
// this deployment's environment, and the header baked into every provisioned ElevenLabs tool.
// Whichever moves first, the other is briefly wrong — and agents can only be re-provisioned one at
// a time. Done by hand, in the wrong order, that is several minutes of every owner's memory tools
// returning 401 mid-conversation, which the owner experiences as Kira abruptly forgetting them.
//
// WHY IT IS NEEDED AT ALL. The value is marked `sensitive` on Vercel, which means non-readable by
// anyone including the dashboard — that is the point of the setting. So a secret nobody wrote down
// cannot be recovered, only replaced. Rotation is the retrieval path.
//
// THE ORDER, and every step earns its place:
//
//   1. Generate.
//   2. Write .env.local FIRST, so the reprovision at step 5 has it locally even if a later step
//      fails and this has to be resumed by hand.
//   3. Set on Vercel as PREVIOUS=<current> is impossible — we cannot read the outgoing value — so
//      this rotation accepts a brief window. Every rotation AFTER this one can set
//      KIRA_TOOL_WEBHOOK_SECRET_PREVIOUS and have none (see toolSecretOk).
//   4. Redeploy and WAIT. Until the new deployment is READY the old one is still serving with the
//      old secret, so agents keep working. The window opens the moment it goes live.
//   5. Re-provision immediately — this is the window, and it is why steps 4 and 5 are one script
//      rather than two things to remember.
//   6. Verify against the live route, because a rotation that reports success without one is a
//      guess.
//
//   node scripts/rotate-tool-secret.mjs --dry-run
//   node scripts/rotate-tool-secret.mjs --apply

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const ENV_PATH = path.join(process.cwd(), '.env.local');
const VAR = 'KIRA_TOOL_WEBHOOK_SECRET';

function readEnvFile() {
  return fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
}

function vercelToken() {
  const p = path.join(process.env.HOME || process.env.USERPROFILE || '', '.vercel-token');
  if (!fs.existsSync(p)) throw new Error('No ~/.vercel-token — cannot reach the Vercel API.');
  return fs.readFileSync(p, 'utf8').trim();
}

function projectRef() {
  const p = path.join(process.cwd(), '.vercel', 'project.json');
  if (!fs.existsSync(p)) throw new Error('No .vercel/project.json — run this from the repo root.');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function vercel(token, url, init = {}) {
  const res = await fetch(`https://api.vercel.com${url}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`vercel ${init.method ?? 'GET'} ${url} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.status === 204 ? null : res.json();
}

// ── 1. generate ──────────────────────────────────────────────────────────────

const next = crypto.randomBytes(32).toString('hex');
const token = vercelToken();
const { projectId, orgId } = projectRef();

console.log(`[rotate] ${APPLY ? 'APPLY' : 'DRY RUN'} · project ${projectId}`);
console.log(`[rotate] new secret generated (${next.length} chars) — not printed`);

if (!APPLY) {
  console.log('[rotate] would: write .env.local → replace the Vercel var (prod+preview, sensitive)');
  console.log('[rotate]        → redeploy and wait → re-provision every agent → verify live');
  console.log('[rotate] re-run with --apply');
  process.exit(0);
}

// ── 2. .env.local first, so a later failure is resumable by hand ─────────────

const envText = readEnvFile();
const line = `${VAR}=${next}`;
const updated = new RegExp(`^${VAR}=.*$`, 'm').test(envText)
  ? envText.replace(new RegExp(`^${VAR}=.*$`, 'm'), line)
  : `${envText.replace(/\n*$/, '')}\n${line}\n`;
fs.writeFileSync(ENV_PATH, updated);
console.log('[rotate] .env.local updated');

// ── 3. Vercel: delete + recreate ─────────────────────────────────────────────
// A sensitive variable's value cannot be PATCHed into place; delete and recreate is the supported
// path, and it must be recreated sensitive on production+preview only — never development, which
// the team policy bans outright.

const { envs } = await vercel(token, `/v10/projects/${projectId}/env?teamId=${orgId}`);
for (const existing of (envs || []).filter((e) => e.key === VAR)) {
  await vercel(token, `/v9/projects/${projectId}/env/${existing.id}?teamId=${orgId}`, { method: 'DELETE' });
  console.log(`[rotate] removed old ${VAR} (${existing.target.join('+')})`);
}
await vercel(token, `/v10/projects/${projectId}/env?teamId=${orgId}`, {
  method: 'POST',
  body: JSON.stringify({ key: VAR, value: next, type: 'sensitive', target: ['production', 'preview'] }),
});
console.log('[rotate] Vercel updated (production+preview, sensitive)');

// ── 4. redeploy, and wait ────────────────────────────────────────────────────
// Env changes only reach running code through a new deployment. Until this is READY the OLD one is
// still serving with the OLD secret, so every agent keeps working — the window opens at the switch,
// which is why step 5 follows immediately and in the same process.

const latest = await vercel(token, `/v6/deployments?projectId=${projectId}&teamId=${orgId}&limit=1&target=production`);
const from = latest.deployments?.[0];
if (!from) throw new Error('No production deployment to redeploy from.');

const created = await vercel(token, `/v13/deployments?teamId=${orgId}&forceNew=1`, {
  method: 'POST',
  body: JSON.stringify({ name: from.name, deploymentId: from.uid, target: 'production' }),
});
console.log(`[rotate] redeploying ${created.id} …`);

for (let i = 0; i < 60; i++) {
  const d = await vercel(token, `/v13/deployments/${created.id}?teamId=${orgId}`);
  if (d.readyState === 'READY') break;
  if (['ERROR', 'CANCELED'].includes(d.readyState)) {
    throw new Error(`Redeploy ${d.readyState}. The new secret is live in Vercel but NOT serving — ` +
      'agents still hold the old one and are still working. Fix the build, then re-run.');
  }
  await new Promise((r) => setTimeout(r, 5000));
}
console.log('[rotate] deployment READY — the window is now open');

// ── 5. re-provision, immediately. THIS IS THE WINDOW. ────────────────────────

process.env[VAR] = next;
try {
  execFileSync(process.execPath, ['--env-file=.env.local', 'scripts/reprovision-kira-agents.mjs', '--tools-only'], {
    stdio: 'inherit',
  });
} catch {
  console.error(
    '[rotate] RE-PROVISION FAILED. Agents still carry the old secret and their tool calls are now ' +
      '401ing. Re-run `node --env-file=.env.local scripts/reprovision-kira-agents.mjs --tools-only` ' +
      'until it succeeds — this is the one step that must not be left half-done.',
  );
  process.exit(1);
}
console.log('[rotate] agents re-provisioned — window closed');

// ── 6. verify against the live route ─────────────────────────────────────────
// A rotation that reports success without checking is a guess, and the failure it would miss is
// silent: every memory call 401ing while the deploy, the env and the script all look fine.

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, '');
const probe = async (secret) =>
  (
    await fetch(`${appUrl}/api/kira/webhooks/recall_memory?uid=rotation-probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-convai-tool-secret': secret },
      body: JSON.stringify({ query: 'rotation probe' }),
    })
  ).status;

const withNew = await probe(next);
const withWrong = await probe('definitely-not-the-secret');
console.log(`[rotate] live check — new secret: ${withNew} · wrong secret: ${withWrong}`);

if (withNew === 401) {
  console.error('[rotate] the NEW secret is being rejected. The deployment may not have picked it up.');
  process.exit(1);
}
if (withWrong !== 401) {
  console.error(`[rotate] a WRONG secret returned ${withWrong}, not 401 — the guard is not enforcing.`);
  process.exit(1);
}
console.log('[rotate] done. Record the new value somewhere durable — it is sensitive and cannot be read back.');
