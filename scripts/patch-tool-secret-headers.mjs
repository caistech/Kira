// scripts/patch-tool-secret-headers.mjs
// Adds the x-kira-tool-secret header to the EXISTING Kira workspace tools.
//
// WHY THIS EXISTS (and why reprovision-kira-agents.mjs could not do it):
// @caistech/elevenlabs-convai's ensureWorkspaceTools() matches an existing workspace tool by
// name + url and, on a match, REUSES its id without ever updating its config. The 5 Kira memory
// tools were created 2026-07-20 before KIRA_TOOL_WEBHOOK_SECRET existed, so every later
// re-provision run silently skipped the header injection — every tool call has 401'd since the
// toolSecretOk() guard went live. Re-running the re-provisioner would never have fixed it.
//
// This patches the workspace tool records in place. Idempotent: a tool that already carries the
// correct header is left alone.
//
// Usage (from repo root):
//   node --env-file=.env.local scripts/patch-tool-secret-headers.mjs [--dry-run]

const { ELEVENLABS_API_KEY, KIRA_TOOL_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL } = process.env;

const DRY_RUN = process.argv.includes('--dry-run');
const TOOLS_API = 'https://api.elevenlabs.io/v1/convai/tools';
const HEADER = 'x-kira-tool-secret';
// Only Kira's own operational tool routes — never another product's tools in the shared workspace.
const KIRA_PATH = '/api/kira/webhooks/';

if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing (run: vercel env pull .env.local --environment=production)');
if (!KIRA_TOOL_WEBHOOK_SECRET) {
  throw new Error(
    'KIRA_TOOL_WEBHOOK_SECRET missing. Without it the routes are INERT (toolSecretOk returns true) ' +
    'and no header is needed — but prod has it set, so pull the production env before running.',
  );
}

const appHost = new URL(NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').host;
const auth = { 'xi-api-key': ELEVENLABS_API_KEY };

const listRes = await fetch(TOOLS_API, { headers: auth });
if (!listRes.ok) throw new Error(`list tools failed: ${listRes.status} ${await listRes.text()}`);
const { tools = [] } = await listRes.json();

// Match on BOTH the Kira route path and our own host, so a same-path tool pointing at someone
// else's deployment is never touched.
const kiraTools = tools.filter((t) => {
  const url = t.tool_config?.api_schema?.url || '';
  if (!url.includes(KIRA_PATH)) return false;
  try {
    return new URL(url).host === appHost;
  } catch {
    return false;
  }
});

console.log(`Found ${kiraTools.length} Kira workspace tool(s) on ${appHost}\n`);

let patched = 0;
let skipped = 0;
let failed = 0;

for (const tool of kiraTools) {
  const cfg = tool.tool_config;
  const name = cfg?.name ?? '(unnamed)';
  const schema = cfg?.api_schema ?? {};
  const headers = schema.request_headers ?? {};

  if (headers[HEADER] === KIRA_TOOL_WEBHOOK_SECRET) {
    console.log(`  = ${name} — already correct, skipping`);
    skipped++;
    continue;
  }

  if (DRY_RUN) {
    console.log(`  ~ ${name} (${tool.id}) — WOULD add ${HEADER}`);
    patched++;
    continue;
  }

  // Preserve the entire existing tool_config; only add the auth header.
  const body = {
    tool_config: {
      ...cfg,
      api_schema: {
        ...schema,
        request_headers: { ...headers, [HEADER]: KIRA_TOOL_WEBHOOK_SECRET },
      },
    },
  };

  try {
    const res = await fetch(`${TOOLS_API}/${tool.id}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    console.log(`  ✓ ${name} (${tool.id}) — header added`);
    patched++;
  } catch (e) {
    console.error(`  ✗ ${name} (${tool.id}): ${e?.message ?? e}`);
    failed++;
  }
}

console.log(`\nDone. ${patched} patched, ${skipped} already correct, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
