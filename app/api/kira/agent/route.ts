// app/api/kira/agent/route.ts
// Get agent info by ElevenLabs agent ID

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { getCurrentOrganisationContext, isCurrentUserAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClientV2();

    // Look up agent by ElevenLabs agent ID
    const { data: agent, error } = await supabase
      .from('kira_agents')
      .select('id, user_id, organisation_id, agent_name, journey_type, status, elevenlabs_agent_id, framework')
      .eq('elevenlabs_agent_id', agentId)
      .single();

    if (error || !agent) {
      console.error('[kira/agent] Agent not found:', error);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Canonical organisation-scoped authorization
    const organisationContext = await getCurrentOrganisationContext();
    if (!organisationContext) {
      return NextResponse.json({ error: 'Not signed in or no organisation access' }, { status: 401 });
    }
    const organisationId = organisationContext.organisationId;

    // Verify agent belongs to this organisation
    const admin = await isCurrentUserAdmin();
    
    const { data: membership } = await supabase
      .from('organisation_memberships')
      .select('id')
      .eq('organisation_id', organisationId)
      .eq('person_id', organisationContext.personId)
      .eq('status', 'active')
      .maybeSingle();

    // INV-020: the agent is organisation-owned. When it already carries `organisation_id` it must
    // match the caller's active organisation; otherwise fall back to membership/direct-owner checks.
    const agentOwnsOrg =
      !agent.organisation_id || agent.organisation_id === organisationId;

    // Allow access if admin or organisation member
    if (!admin && (!membership || !agentOwnsOrg)) {
      return NextResponse.json({ error: 'Not authorized for this agent' }, { status: 403 });
    }

    return NextResponse.json({
      id: agent.id,
      // user_id is retained as provenance; organisation_id is the ownership/tenant scope (INV-020).
      user_id: agent.user_id,
      organisation_id: agent.organisation_id ?? organisationId,
      agent_name: agent.agent_name,
      journey_type: agent.journey_type,
      status: agent.status,
      elevenlabs_agent_id: agent.elevenlabs_agent_id,
      // The chat page renders the spoken welcome-back opener from context and needs the owner's
      // first name for it. Only the name is exposed — the rest of the framework is the (often
      // months-stale) signup snapshot and must not reach the client as if it were current state.
      first_name: agent.framework?.firstName ?? null,
    });

  } catch (error) {
    console.error('[kira/agent] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}