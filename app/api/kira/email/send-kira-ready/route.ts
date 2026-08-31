// app/api/kira/email/send-kira-ready/route.ts
// Called after Operational Kira is created to send the welcome email
// P2.2: Agent webhook — HMAC trust boundary, canonical org resolution.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { toolSecretOk } from '@/lib/kira/convai';
import { sendKiraReadyEmail } from '@/lib/email/resend';

interface SendKiraReadyRequest {
  agent_id: string; // ElevenLabs agent ID
}

export async function POST(request: NextRequest) {
  try {
    // P2.2: Agent webhook trust boundary — HMAC verification.
    if (!toolSecretOk(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClientV2();
    const body: SendKiraReadyRequest = await request.json();

    console.log('[send-kira-ready] Received:', { agent_id: body.agent_id });

    if (!body.agent_id) {
      return NextResponse.json(
        { error: 'Missing agent_id' },
        { status: 400 }
      );
    }

    // P2.2: Resolve org ownership + person identity from agent binding (server-derived, not
    // client-supplied). organisation_id is the ownership seat (INV-020); user_id is provenance only.
    const { data: agent, error: agentError } = await supabase
      .from('kira_agents')
      .select('user_id, organisation_id')
      .eq('elevenlabs_agent_id', body.agent_id)
      .single();

    if (agentError || !agent?.organisation_id || !agent?.user_id) {
      console.error('[send-kira-ready] Agent not found:', agentError);
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const userId = agent.user_id;
    const organisationId = agent.organisation_id;

    // P2.2: Resolve person details through canonical chain (not directly from users table).
    const { data: credential } = await supabase
      .from('auth_credentials')
      .select('person_id')
      .eq('auth_user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    let userName = 'there';
    let userEmail: string | null = null;
    let journeyType = 'personal';

    if (credential?.person_id) {
      const { data: person } = await supabase
        .from('persons')
        .select('first_name, last_name, email')
        .eq('person_id', credential.person_id)
        .single();

      if (person) {
        userName = [person.first_name, person.last_name].filter(Boolean).join(' ') || 'there';
        userEmail = person.email;
      }
    }

    // Fallback: if canonical resolution failed, try legacy users table for email/journey.
    if (!userEmail) {
      const { data: legacyUser } = await supabase
        .from('users')
        .select('name, email, journey_type')
        .eq('id', userId)
        .single();

      if (legacyUser) {
        userName = legacyUser.name || userName;
        userEmail = legacyUser.email;
        journeyType = legacyUser.journey_type || journeyType;
      }
    }

    if (!userEmail) {
      console.log('[send-kira-ready] No email for user, skipping');
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No email address'
      });
    }

    // Send the email
    const result = await sendKiraReadyEmail({
      userName,
      userEmail,
      agentId: body.agent_id,
      journeyType,
    });

    console.log('[send-kira-ready] Email sent:', result?.id);

    // Log the email send (non-critical, don't fail if this errors)
    try {
      await supabase
        .from('email_logs')
        .insert({
          person_id: credential?.person_id ?? null,
          organisation_id: organisationId,
          email_type: 'kira_ready',
          recipient: userEmail,
          status: 'sent',
          resend_id: result?.id,
        });
    } catch (logError) {
      console.log('[send-kira-ready] Failed to log email:', logError);
    }

    return NextResponse.json({
      success: true,
      email_id: result?.id,
    });

  } catch (error) {
    console.error('[send-kira-ready] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
