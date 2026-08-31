// app/api/genome/conflicts/route.ts
//
// GET /api/genome/conflicts — the Conflict Detection API.
//
// Answers:
//   - "Where are the contradictions?"
//   - "What facts conflict with each other?"
//   - "What needs resolution?"

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { detectCrossConversationConflicts } from '@/business-genome/conflicts';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const areaKey = searchParams.get('area') || undefined;

    const conflicts = await detectCrossConversationConflicts(ctx.organisationId, areaKey);

    return NextResponse.json({
      organisation_id: ctx.organisationId,
      total: conflicts.length,
      conflicts,
    });
  } catch (error) {
    console.error('[genome/conflicts] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
