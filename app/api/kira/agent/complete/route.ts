// app/api/kira/agent/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { getCurrentOrganisationContext } from '@/lib/auth';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, userId, feedback } = body;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    // INV-020: kira_agents is organisation-owned. The caller is the authenticated session (this
    // route is hit from /chat), so resolve the org server-side — never from the client body.
    const organisationContext = await getCurrentOrganisationContext();
    if (!organisationContext) {
      return NextResponse.json({ error: 'Not signed in or no organisation access' }, { status: 401 });
    }
    const organisationId = organisationContext.organisationId;

    const supabase = createServiceClientV2();

    // Get the agent details — scoped to the caller's organisation.
    const { data: agent, error: fetchError } = await supabase
      .from('kira_agents')
      .select('*')
      .eq('elevenlabs_agent_id', agentId)
      .eq('organisation_id', organisationId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Update agent status to 'completed' — scoped to the caller's organisation.
    const { error: updateError } = await supabase
      .from('kira_agents')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_feedback: feedback || null,
      })
      .eq('id', agent.id)
      .eq('organisation_id', organisationId);

    if (updateError) {
      console.error('[agent/complete] Update error:', updateError);
      throw updateError;
    }

    // Optionally delete the agent from ElevenLabs to free up resources
    // (or keep it for history - uncomment below to delete)
    /*
    try {
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });
    } catch (elevenLabsError) {
      console.error('[agent/complete] ElevenLabs delete error:', elevenLabsError);
      // Don't fail if ElevenLabs delete fails
    }
    */

    // Log the completion for analytics
    console.log('[agent/complete] Project completed:', {
      agentId,
      agentName: agent.agent_name,
      userId,
      journeyType: agent.journey_type,
      feedback: feedback ? 'provided' : 'none',
    });

    return NextResponse.json({
      success: true,
      message: 'Project completed successfully',
      agent: {
        id: agent.id,
        name: agent.agent_name,
        status: 'completed',
      },
    });

  } catch (error) {
    console.error('[agent/complete] Error:', error);
    return NextResponse.json(
      { error: 'Failed to complete project. Please try again.' },
      { status: 500 }
    );
  }
}