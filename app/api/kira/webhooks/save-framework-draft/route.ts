// app/api/kira/webhooks/save-framework-draft/route.ts
// Webhook handler for Setup Kira's save-framework-draft tool

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientV2 } from '@/lib/supabase/server';

interface SaveFrameworkDraftPayload {
  tool_name: string;
  user_name: string;
  location: string;
  journey_type: 'personal' | 'business';
  primary_objective: string;
  key_context: string[];
  success_definition?: string;
  constraints?: string[];
  conversation_id?: string;
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClientV2();  // ✅ Now inside the function

  try {
    const payload: SaveFrameworkDraftPayload = await request.json();

    // The ElevenLabs conversation id lets /start scope its draft poll to THIS user's own
    // conversation (instead of "any recent draft", which could briefly surface another concurrent
    // user's draft). Prefer the x-conversation-id header (how ElevenLabs tags tool calls), fall
    // back to the body field.
    const conversationId = request.headers.get('x-conversation-id') || payload.conversation_id || null;

    console.log('[save-framework-draft] Received:', {
      user_name: payload.user_name,
      journey_type: payload.journey_type,
      objective: payload.primary_objective?.slice(0, 50) + '...',
    });

    // Validate required fields
    if (!payload.user_name || !payload.location || !payload.journey_type || !payload.primary_objective) {
      return NextResponse.json(
        { error: 'Missing required fields: user_name, location, journey_type, primary_objective' },
        { status: 400 }
      );
    }

    // Extract first name for greeting
    const firstName = payload.user_name.split(' ')[0];

    // P0.6: Resolve organisation_id from conversation_id
    let organisationId: string | null = null;
    if (conversationId) {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('organisation_id')
        .eq('elevenlabs_conversation_id', conversationId)
        .maybeSingle();

      if (conv && conv.organisation_id) {
        organisationId = conv.organisation_id;
      }
    }

    if (!organisationId) {
      console.error('[save-framework-draft] Failed to resolve organisation_id for conversation:', conversationId);
      return NextResponse.json(
        { error: 'Failed to resolve organisation context' },
        { status: 400 }
      );
    }

    // Save to kira_drafts table
    const { data: draft, error } = await supabase
      .from('kira_drafts')
      .insert({
        user_name: payload.user_name,
        first_name: firstName,
        location: payload.location,
        journey_type: payload.journey_type,
        primary_objective: payload.primary_objective,
        key_context: payload.key_context || [],
        success_definition: payload.success_definition,
        constraints: payload.constraints || [],
        status: 'draft',
        elevenlabs_conversation_id: conversationId,
        organisation_id: organisationId,
      })
      .select()
      .single();

    if (error) {
      console.error('[save-framework-draft] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save draft' },
        { status: 500 }
      );
    }

    console.log('[save-framework-draft] Draft saved:', draft.id);

    // Return success response for ElevenLabs
    // This is what Setup Kira will "hear" as the tool result
    return NextResponse.json({
      success: true,
      draft_id: draft.id,
      message: `Framework saved for ${firstName}. They can now see it on screen to review and edit.`,
    });

  } catch (error) {
    console.error('[save-framework-draft] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}