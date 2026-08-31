// app/api/genome/plan/route.ts
//
// GET /api/genome/plan — the Conversation Planning API.
//
// Answers:
//   - "What should Kira focus on in the next call?"
//   - "Which area needs the most attention?"
//   - "What's the opening question?"
//
// Used by: Orchestrator, voice loop, area-focus.

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { generateConversationPlan } from '@/business-genome/conversation-loop';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const focusArea = searchParams.get('area') || undefined;
    const maxQuestions = parseInt(searchParams.get('limit') || '5', 10);

    const plan = await generateConversationPlan(ctx.organisationId, { focusArea, maxQuestions });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('[genome/plan] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
