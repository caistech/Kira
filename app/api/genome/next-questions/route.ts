// app/api/genome/next-questions/route.ts
//
// GET /api/genome/next-questions — the Orchestrator's input.
//
// Answers:
//   - "What should Kira ask next?"
//   - "Which area needs the most attention?"
//   - "What question would most improve the Genome?"
//
// Used by: Phase 9 (Conversation → Genome feedback loop),
//          Orchestrator, Kira's voice loop.

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { getNextQuestions } from '@/business-genome/coverage';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const focusArea = searchParams.get('area') || undefined;

    const questions = await getNextQuestions(ctx.organisationId, { limit, focusArea });

    return NextResponse.json({
      organisation_id: ctx.organisationId,
      questions,
    });
  } catch (error) {
    console.error('[genome/next-questions] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
