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
      .select('elevenlabs_agent_id, status, user_id, organisation_id')
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
    const organisationId = organisationContext.organisationId;

    // Verify agent belongs to this organisation (or user owns it for backward compatibility)
    const { data: membership } = await supabase
      .from('organisation_memberships')
      .select('membership_id')
      .eq('organisation_id', organisationId)
      .eq('person_id', organisationContext.personId)
      .eq('status', 'active')
      .maybeSingle();

    const admin = await isCurrentUserAdmin();
    // INV-020: the agent is organisation-owned. When the agent already carries `organisation_id`,
    // it must match the caller's active organisation; otherwise fall back to membership/admin.
    const agentOwnsOrg =
      !kiraAgent.organisation_id || kiraAgent.organisation_id === organisationId;

    // Allow access if admin, organisation member, or legacy fallback (if we had users table loaded, but we don't need it if membership is present)
    if (!admin && (!membership || !agentOwnsOrg)) {
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