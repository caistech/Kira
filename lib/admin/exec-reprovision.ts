// lib/admin/exec-reprovision.ts
// The live rollout for #12: brings ALREADY-provisioned BUSINESS agents onto the fractional-exec
// persona + the doing-slice tools (dispatch_task / approve_task). New agents get both at creation
// (getBusinessPrompt + kiraAllTools); this reconciles the ones minted before.
//
// Per agent (business journey only — personal-journey coaches keep the curious-friend register):
//   1. persona swap — exact-string replace of the CORE_PHILOSOPHY block with execPhilosophyFor()
//      inside the live system prompt (upgradeBusinessPersona; deterministic + idempotent),
//   2. re-attach the full tool set (memory + knowledge + the two doing tools) with THIS owner's uid
//      baked into the uid-tools — kiraAllTools already includes the doing tools.
//
// Safe to re-run: a persona already on exec is left alone; setAgentTools is idempotent config.
// Dry-run by default at the route; this module executes what it's asked.

import {
  getAgent,
  updateAgent,
  setAgentTools,
  setAgentOverrides,
  conversationContinuityPrompt,
} from '@caistech/elevenlabs-convai';
import { createServiceClient } from '@/lib/supabase/server';
import { getKiraPrompt, upgradeBusinessPersona, type KiraFramework } from '@/lib/kira/prompts';
import { kiraAllTools } from '@/lib/kira/convai';

const CONTINUITY_MARKER = '## CONVERSATION CONTINUITY';

/**
 * REBUILD the whole system prompt from source, rather than patching the live one.
 *
 * WHY A REBUILD AND NOT MORE PATCHES. Patching is what produced the state this exists to fix. The
 * live agents were provisioned in January and every correction since has been either an APPEND
 * (which lands) or a REPLACE keyed to exact text (which silently did not, once the source text was
 * edited underneath it). The result, measured 2026-08-04: an agent still on the curious-friend
 * persona, still holding a signup snapshot that said the owner wanted help fixing diesel injectors,
 * and still being told about three tools that do not exist — while nine other sections were present
 * and correct. Surgical replacement of each drifted section is more of the same technique that
 * failed, and it fails the same way the next time a section's wording changes.
 *
 * So the prompt becomes a BUILD ARTIFACT: generated from `getKiraPrompt` plus this agent's stored
 * framework, every time. Anything that must persist has to be reproducible from source, which is the
 * property that was missing.
 *
 * THE ONE THING CARRIED OVER is the canonical continuity block, because it is appended by the
 * package rather than built by us — dropping it would silently remove the instruction to call
 * `get_conversation_context` at turn zero, which is the opposite of the fix.
 */
function rebuildPrompt(stored: unknown, firstName: string, livePrompt: string): string {
  const f = (stored ?? {}) as Partial<KiraFramework>;
  const framework: KiraFramework = {
    userName: String(f.userName ?? firstName),
    firstName,
    // Location and constraints survive; the signup objective deliberately does not reach the prompt
    // at all any more (see buildFrameworkSection), so passing it here is inert and kept only because
    // the type requires it.
    location: String(f.location ?? ''),
    journeyType: 'business',
    primaryObjective: String(f.primaryObjective ?? ''),
    keyContext: Array.isArray(f.keyContext) ? f.keyContext.map(String) : [],
    successDefinition: f.successDefinition ? String(f.successDefinition) : undefined,
    constraints: Array.isArray(f.constraints) ? f.constraints.map(String) : undefined,
  };

  const { systemPrompt } = getKiraPrompt({ framework });
  // Re-append rather than assume: an agent that never had it should not silently gain it here, and
  // one that had it must not lose it.
  return livePrompt.includes(CONTINUITY_MARKER)
    ? `${systemPrompt}\n\n${conversationContinuityPrompt}`
    : systemPrompt;
}

export interface ExecReprovisionResult {
  total: number;
  personaSwapped: number;
  toolsAttached: number;
  skipped: number;
  failed: number;
  details: Array<{ agent: string; id: string | null; changes: string[]; error?: string }>;
}

export async function reprovisionBusinessAgentsForExec(opts: { apply: boolean }): Promise<ExecReprovisionResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY missing');
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app').replace(/\/$/, '');

  const supabase = createServiceClient();
  const discoveryId = process.env.DISCOVERY_AGENT_ID;

  let query = supabase
    .from('kira_agents')
    .select('id, elevenlabs_agent_id, agent_name, status, journey_type, user_id, framework')
    .eq('journey_type', 'business')
    .in('status', ['active', 'paused'])
    .neq('agent_name', 'Kira Discovery');
  if (discoveryId) query = query.neq('elevenlabs_agent_id', discoveryId);

  const { data: agents, error } = await query;
  if (error) throw error;

  const result: ExecReprovisionResult = {
    total: agents?.length ?? 0,
    personaSwapped: 0,
    toolsAttached: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const a of agents ?? []) {
    const id = a.elevenlabs_agent_id as string | null;
    const changes: string[] = [];
    if (!id) {
      result.skipped++;
      result.details.push({ agent: a.agent_name, id: null, changes: ['no elevenlabs_agent_id'] });
      continue;
    }
    try {
      const firstName =
        (a.framework?.firstName as string) || String(a.framework?.userName || '').split(' ')[0] || 'there';

      // 1. persona swap (needs the current live prompt).
      const live = (await getAgent(apiKey, id)) as {
        conversation_config?: { agent?: { prompt?: { prompt?: string } } };
      };
      const currentPrompt = live?.conversation_config?.agent?.prompt?.prompt || '';

      // REBUILD, not patch. See rebuildPrompt for why the surgical route is the thing that failed.
      const nextPrompt = rebuildPrompt(a.framework, firstName, currentPrompt);
      const changed = nextPrompt.trim() !== currentPrompt.trim();

      if (changed) {
        changes.push(`prompt rebuilt from source (${currentPrompt.length} → ${nextPrompt.length} chars)`);
        // Name the defects this specific agent was carrying, so the dry run is reviewable by someone
        // who has not read the diff. These are the three that were measured live.
        if (!currentPrompt.includes('## REMOVE A HEADACHE THEY DREAD')) changes.push('  - was on the legacy curious-friend persona');
        if (/What they want help with/i.test(currentPrompt)) changes.push('  - was carrying a signup snapshot as fact');
        for (const phantom of ['start_research_session', 'save_finding', 'search_web']) {
          if (currentPrompt.includes(phantom)) { changes.push(`  - was told about a tool that does not exist: ${phantom}`); }
        }
      } else {
        changes.push('prompt already matches source');
      }

      // The persona check now only REPORTS — the rebuild has already replaced it. Kept because
      // `unreachable` on a rebuilt prompt would mean the generator itself stopped emitting the exec
      // persona, which is worth failing on rather than shipping quietly.
      const { reason } = upgradeBusinessPersona(nextPrompt, firstName);
      if (reason !== 'already') {
        result.failed++;
        changes.push(`REBUILD DID NOT PRODUCE THE EXEC PERSONA (${reason}) — not applied`);
        result.details.push({ agent: a.agent_name, id, changes });
        continue;
      }

      // 2. tool set: memory + knowledge + doing (uid-baked for this owner).
      changes.push('tools → +dispatch_task/approve_task');

      if (opts.apply) {
        // updateAgent replaces the prompt object (drops tool_ids), so swap the prompt FIRST, then
        // re-attach tools (setAgentTools reads the current prompt and preserves it + adds tool_ids).
        if (changed) await updateAgent(apiKey, id, { systemPrompt: nextPrompt });
        await setAgentTools(apiKey, id, kiraAllTools(appUrl, a.user_id as string));
        await setAgentOverrides(apiKey, id);
      }

      if (changed) result.personaSwapped++;
      result.toolsAttached++;
      result.details.push({ agent: a.agent_name, id, changes });
    } catch (e) {
      result.failed++;
      result.details.push({ agent: a.agent_name, id, changes, error: String((e as Error)?.message ?? e) });
    }
  }

  return result;
}
