// scripts/patch-tool-secret-headers.mjs
// Migrates Kira's workspace tools onto the CANONICAL x-convai-tool-secret header, removing the
// legacy x-kira-tool-secret key.
//
// WHY THIS EXISTS (and why reprovision-kira-agents.mjs could not do it):
// reprovision only touches tools that are ATTACHED to an active agent. Detached workspace tools
// survive in the shared workspace with whatever header they were created with — 15 of them were
// found still carrying the legacy key after all 13 agents had moved to the canonical one. They are
// harmless while unreferenced and become a 401 the moment anyone re-attaches one, which is the
// worst time to discover it. This clears that landmine so removing the legacy acceptance from
// toolSecretOk() is unambiguously safe.
//
// This script previously did the OPPOSITE — it ADDED the legacy header, which was correct during
// the rename and became actively harmful once the route stopped accepting it. It is repurposed
// rather than deleted so the capability (patch tool configs in place, scoped to our own host)
// survives; ensureWorkspaceTools only updates on a name+url match, so detached tools need this.
//
// Idempotent: a tool already on the canonical header with no legacy key is left alone.
//
// Usage (from repo root):
//   node --env-file=.env.local scripts/patch-tool-secret-headers.mjs [--dry-run]

const { ELEVENLABS_API_KEY, KIRA_TOOL_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL } = process.env;

const DRY_RUN = process.argv.includes('--dry-run');
const TOOLS_API = 'https://api.elevenlabs.io/v1/convai/tools';
// The package's canonical header. A product-local name for a portfolio-wide mechanism is a fork.
const HEADER = 'x-convai-tool-secret';
const LEGACY_HEADER = 'x-kira-tool-secret';
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

  const onCanonical = headers[HEADER] === KIRA_TOOL_WEBHOOK_SECRET;
  const hasLegacy = LEGACY_HEADER in headers;

  if (onCanonical && !hasLegacy) {
    console.log(`  = ${name} — already canonical, skipping`);
    skipped++;
    continue;
  }

  if (DRY_RUN) {
    console.log(
      `  ~ ${name} (${tool.id}) — WOULD set ${HEADER}${hasLegacy ? ` and drop ${LEGACY_HEADER}` : ''}`,
    );
    patched++;
    continue;
  }

  // Preserve the entire existing tool_config; set the canonical header and DROP the legacy key.
  // Leaving the legacy key in place would keep the landmine armed — the point is that no tool
  // presents a header the route no longer accepts.
  const nextHeaders = { ...headers, [HEADER]: KIRA_TOOL_WEBHOOK_SECRET };
  delete nextHeaders[LEGACY_HEADER];

  const body = {
    tool_config: {
      ...cfg,
      api_schema: { ...schema, request_headers: nextHeaders },
    },
  };

  try {
    const res = await fetch(`${TOOLS_API}/${tool.id}`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    console.log(`  ✓ ${name} (${tool.id}) — migrated to ${HEADER}`);
    patched++;
  } catch (e) {
    console.error(`  ✗ ${name} (${tool.id}): ${e?.message ?? e}`);
    failed++;
  }
}

console.log(`\nDone. ${patched} patched, ${skipped} already correct, ${failed} failed.`);
if (failed > 0) process.exitCode = 1;
