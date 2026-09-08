// app/api/kira/chat/start/route.ts
// Issues a signed ElevenLabs URL for a USER-SPECIFIC Kira chat agent

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { getCurrentOrganisationContext, isCurrentUserAdmin } from '@/lib/auth';
import { haltState } from '@/lib/kill-switch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // The kill switch — same chokepoint reasoning as /api/kira/start: no signed URL, no new
    // conversation, no redeploy needed. Both start routes are gated because halting one and not the
    // other would be a control that only appears to work.
    const halt = await haltState('conversations');
    if (halt.halted) {
      console.warn('[kill-switch] refused chat start:', halt.scope, halt.reason);
      return NextResponse.json(
        { error: 'Kira is briefly unavailable. Please try again shortly.' },
        { status: 503 },
      );
    }

    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'Missing ELEVENLABS_API_KEY' },
        { status: 500 }
      );
    }

    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClientV2();

    /* ------------------------------------------------------------ */
    /* 1. Load Kira agent                                           */
    /* ------------------------------------------------------------ */

    const { data: kiraAgent, error } = await supabase
      .from('kira_agents')
      .select('elevenlabs_agent_id, status, person_id, organisation_id')
      .eq('elevenlabs_agent_id', agentId)
      .single();

    if (error || !kiraAgent) {
      return NextResponse.json(
        { error: 'Kira agent not found' },
        { status: 404 }
      );
    }

    // Canonical organisation-scoped authorization
    const organisationContext = await getCurrentOrganisationContext();
    if (!organisationContext) {
      return NextResponse.json({ error: 'Not signed in or no organisation access' }, { status: 401 });
    }

    const admin = await isCurrentUserAdmin();
    // Allow if caller is org admin, OR agent belongs to caller's organisation
    const isOrgMember = kiraAgent.organisation_id === organisationContext.organisationId;
    const isOwner = kiraAgent.person_id === organisationContext.personId;

    if (!admin && !isOrgMember && !isOwner) {
      return NextResponse.json({ error: 'Not authorized for this agent' }, { status: 403 });
    }

    if (kiraAgent.status !== 'active') {
      return NextResponse.json(
        { error: 'Kira agent is not active' },
        { status: 403 }
      );
    }

    /* ------------------------------------------------------------ */
    /* 2. Request signed URL from ElevenLabs                        */
    /* ------------------------------------------------------------ */

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${kiraAgent.elevenlabs_agent_id}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );


    if (!response.ok) {
      const err = await response.text();
      console.error('[kira/chat/start] ElevenLabs error:', err);
      return NextResponse.json(
        { error: 'Failed to start voice session' },
        { status: 502 }
      );
    }


    const data = await response.json();

    if (!data.signed_url) {
      return NextResponse.json(
        { error: 'Invalid ElevenLabs response' },
        { status: 500 }
      );
    }

    console.log('[kira/chat/start] signed URL issued', {
      agentId: kiraAgent.elevenlabs_agent_id,
      signedUrlHost: new URL(data.signed_url).host,
      signedUrlPath: new URL(data.signed_url).pathname,
      hasConversationSignature:
        new URL(data.signed_url).searchParams.has('conversation_signature'),
      hasToken:
        new URL(data.signed_url).searchParams.has('token'),
    });

    /* ------------------------------------------------------------ */
    /* 3. Return signed URL                                        */
    /* ------------------------------------------------------------ */

    return NextResponse.json({
      signedUrl: data.signed_url,
    });
  } catch (err) {
    console.error('[kira/chat/start] Fatal:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

