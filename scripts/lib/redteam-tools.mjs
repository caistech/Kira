// scripts/lib/redteam-tools.mjs
//
// THE OPERATIONAL TOOL SET FOR ONE OWNER — single-sourced.
//
// This was a function inside reprovision-kira-agents.mjs carrying the comment "change one, change
// both", which is a warning that a second copy already existed in spirit. The red-team provisioner
// needs the identical set (a synthetic owner whose agent is not built the same way is not a test of
// the real thing), so the choice was to copy it a third time or to lift it here. Copying is how the
// tool-secret migration silently stripped dispatch_task and approve_task off ten live agents: a list
// that had fallen out of step with its twin.
//
// setAgentTools REPLACES an agent's tool list. Anything omitted from this function is not "skipped",
// it is REMOVED from every agent the caller touches — so this list must stay in step with
// kiraAllTools() in lib/kira/convai.ts, which .mjs cannot import.

import { CONVAI_TOOL_SECRET_HEADER } from '@caistech/elevenlabs-convai';

// THE LIST ITSELF NOW LIVES IN lib/kira/tool-manifest.mjs, and this file only decorates it with the
// uid and the secret. It moved because the PROMPT needs the same list: its hand-written `## TOOLS`
// section had drifted into naming three tools that do not exist, which the agent then reaches for
// and reports to the owner as something she "can't access". One array, two consumers — the prompt
// can no longer describe a tool that is not attached.
import { toolDefsFor } from '../../lib/kira/tool-manifest.mjs';
import { isUidToolUrl } from '../../lib/kira/uid-tools.mjs';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, '');

/**
 * Every tool this owner's agent should hold, uid-baked and secret-headed.
 *
 * @param {string} userId       the APP user id (not the auth id) — becomes ?uid= on every uid tool
 * @param {string} journeyType  'business' gets the doing slice + the Google slice; personal does not
 * @returns {Array<Record<string, unknown>>}
 */
export function buildToolsForUser(userId, journeyType) {
  const secret = process.env.KIRA_TOOL_WEBHOOK_SECRET ?? process.env.CONVAI_TOOL_SECRET;
  if (!secret) {
    // Refuse rather than silently provision agents that cannot authenticate. The route guard fails
    // closed, so a header-less agent is not "slightly degraded" — it is an agent whose every memory
    // call 401s, which surfaces to the owner as Kira quietly forgetting them.
    throw new Error(
      'KIRA_TOOL_WEBHOOK_SECRET (or CONVAI_TOOL_SECRET) is not set. Provisioning without it would ' +
        'produce agents that cannot call their own webhooks.',
    );
  }

  // platformIdentity, the entity guard, the doing slice and the confirmation pair all live in the
  // manifest now — including the reason the confirmation pair is TWO tools rather than a flag.
  const tools = toolDefsFor(journeyType, APP_URL);

  for (const t of tools) {
    if (!t.webhook) continue;
    // The uid list is single-sourced (lib/kira/uid-tools.mjs) precisely because this file and
    // kiraAllTools used to carry two hand-maintained copies of it.
    if (userId && isUidToolUrl(t.webhook.url)) {
      t.webhook.url = `${t.webhook.url}?uid=${encodeURIComponent(userId)}`;
    }
    t.webhook.headers = { ...(t.webhook.headers ?? {}), [CONVAI_TOOL_SECRET_HEADER]: secret };
  }
  return tools;
}
