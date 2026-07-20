// app/api/kira/setup-tools/route.ts
// Handles the Setup Kira agent's session-state tool calls: set_journey_type + save_user_context.
//
// DEPRECATED: create_operational_kira (immediate agent creation under a temp-email user) has been
// removed. Onboarding now runs through the AUTHENTICATED draft flow — the setup agent calls
// save_framework_draft (→ kira_drafts), the signed-in user reviews at /setup/draft/[draftId], and
// /api/kira/create attributes the agent to their account (see the draft page + auth-link trigger).
// The case is kept only to return a clear deprecation response if a stale agent config still
// invokes it, rather than silently minting an orphaned temp-user agent.

import { NextRequest, NextResponse } from 'next/server';

// In-memory session storage keyed by conversation_id (documented as temporary; see project CLAUDE.md).
const setupSessions: Map<string, SetupSession> = new Map();

interface SetupSession {
  conversationId: string;
  journeyType?: 'personal' | 'business';
  journeyConfidence?: 'confirmed' | 'inferred';
  contexts: Array<{
    type: string;
    content: string;
    importance: number;
  }>;
  userName?: string;
  createdAt: Date;
}

function getOrCreateSession(conversationId: string): SetupSession {
  if (!setupSessions.has(conversationId)) {
    setupSessions.set(conversationId, {
      conversationId,
      contexts: [],
      createdAt: new Date(),
    });
  }
  return setupSessions.get(conversationId)!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool_name } = body;

    const conversationId = request.headers.get('x-conversation-id') || 'unknown';
    console.log(`[setup-tools] Tool: ${tool_name}, Conversation: ${conversationId}`);

    switch (tool_name) {
      case 'set_journey_type':
        return handleSetJourneyType(conversationId, body);
      case 'save_user_context':
        return handleSaveUserContext(conversationId, body);
      case 'create_operational_kira':
        // DEPRECATED — see file header. Do NOT create an agent here; direct the setup agent to
        // save a draft so the signed-in user creates their Kira from their own account.
        console.warn('[setup-tools] create_operational_kira is deprecated; use save_framework_draft + the authenticated draft flow.');
        return NextResponse.json({
          result: {
            success: false,
            deprecated: true,
            message:
              "Save the framework as a draft (save_framework_draft) so the user can review it and create their Kira from their account.",
          },
        });
      default:
        return NextResponse.json({ error: `Unknown tool: ${tool_name}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[setup-tools] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// SET JOURNEY TYPE
// =============================================================================

function handleSetJourneyType(
  conversationId: string,
  body: { journey_type: 'personal' | 'business'; confidence: 'confirmed' | 'inferred'; signal?: string }
) {
  const session = getOrCreateSession(conversationId);

  session.journeyType = body.journey_type;
  session.journeyConfidence = body.confidence;

  console.log(`[set_journey_type] Set to ${body.journey_type} (${body.confidence})`);
  if (body.signal) {
    console.log(`[set_journey_type] Signal: "${body.signal}"`);
  }

  return NextResponse.json({
    result: {
      success: true,
      journey_type: body.journey_type,
      message: body.journey_type === 'personal'
        ? "Got it — this is about life stuff. I'll focus my questions there."
        : "Got it — this is about work stuff. I'll focus my questions there.",
    }
  });
}

// =============================================================================
// SAVE USER CONTEXT
// =============================================================================

function handleSaveUserContext(
  conversationId: string,
  body: { context_type: string; content: string; importance?: number }
) {
  const session = getOrCreateSession(conversationId);

  // Check if it's their name
  if (body.context_type === 'name') {
    session.userName = body.content;
  }

  session.contexts.push({
    type: body.context_type,
    content: body.content,
    importance: body.importance || 5,
  });

  console.log(`[save_user_context] Saved ${body.context_type}: "${body.content.substring(0, 50)}..."`);
  console.log(`[save_user_context] Session now has ${session.contexts.length} context pieces`);

  return NextResponse.json({
    result: {
      success: true,
      contexts_saved: session.contexts.length,
      message: "Got it, I'll remember that.",
    }
  });
}
