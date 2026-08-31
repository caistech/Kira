// app/api/kira/conversation/context/route.ts
// Returns conversation history and context for seamless continuation

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentOrganisationContext } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const messageLimit = parseInt(searchParams.get('limit') || '20');

    // Canonical organisation-scoped authorization
    const organisationContext = await getCurrentOrganisationContext();
    if (!organisationContext) {
      return NextResponse.json(
        { error: 'Not signed in or no organisation access' },
        { status: 401 }
      );
    }
    const organisationId = organisationContext.organisationId;

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId' },
        { status: 400 }
      );
    }

    // Get the internal kira_agent record - organisation-scoped
    const { data: agent, error: agentError } = await supabase
      .from('kira_agents')
      .select('id')
      .eq('elevenlabs_agent_id', agentId)
      .eq('organisation_id', organisationId)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Call the database function to get context - organisation-scoped
    const { data: context, error: contextError } = await supabase
      .rpc('get_conversation_context', {
        p_agent_id: agent.id,
        p_organisation_id: organisationId,
        p_message_limit: messageLimit
      });

    if (contextError) {
      console.error('[conversation/context] Error:', contextError);
      return NextResponse.json(
        { error: 'Failed to get conversation context' },
        { status: 500 }
      );
    }

    // Format the return greeting based on time gap
    const greeting = generateReturnGreeting(context);

    return NextResponse.json({
      ...context,
      suggested_greeting: greeting
    });

  } catch (error) {
    console.error('[conversation/context] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateReturnGreeting(context: any): string {
  if (!context.has_history) {
    return "Hey! Great to meet you. What can I help you with today?";
  }

  const { time_gap_category, last_topic, title } = context;
  const topicRef = last_topic || title || 'what we were discussing';

  switch (time_gap_category) {
    case 'recent':
      // Less than 1 hour - just continue naturally
      return ""; // No greeting needed, just continue
    
    case 'today':
      // 1-24 hours
      return `Hey, you're back! We were talking about ${topicRef} — want to pick up where we left off, or is there something else on your mind?`;
    
    case 'this_week':
      // 1-7 days
      return `Good to see you again! Last time we were working on ${topicRef}. Want to continue with that, or something new today?`;
    
    default:
      // More than 7 days
      return `Hey! It's been a bit. Quick recap: we were working on ${topicRef}. Still relevant, or have things changed?`;
  }
}
