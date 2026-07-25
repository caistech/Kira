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

import { getAgent, updateAgent, setAgentTools, setAgentOverrides } from '@caistech/elevenlabs-convai';
import { createServiceClient } from '@/lib/supabase/server';
import { upgradeBusinessPersona } from '@/lib/kira/prompts';
import { kiraAllTools } from '@/lib/kira/convai';

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
      const { prompt: nextPrompt, changed } = upgradeBusinessPersona(currentPrompt, firstName);
      if (changed) changes.push('persona → fractional exec');

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
