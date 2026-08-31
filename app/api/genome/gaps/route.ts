// app/api/genome/gaps/route.ts
//
// GET /api/genome/gaps — the Gap Detection API.
//
// Answers:
//   - "What don't we know?"
//   - "Where are the weak spots?"
//   - "What knowledge is missing?"
//
// Used by: Orchestrator (Phase 9), agents, reports.

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { findKnowledgeGaps } from '@/business-genome/coverage';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity'); // 'high' | 'medium' | 'low'
    const areaKey = searchParams.get('area');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const gaps = await findKnowledgeGaps(ctx.organisationId);

    // Filter by severity if specified
    let filtered = severity
      ? gaps.filter((g) => g.severity === severity)
      : gaps;

    // Filter by area if specified
    if (areaKey) {
      filtered = filtered.filter((g) => g.area_key === areaKey);
    }

    // Limit results
    filtered = filtered.slice(0, limit);

    return NextResponse.json({
      organisation_id: ctx.organisationId,
      total_gaps: gaps.length,
      returned_gaps: filtered.length,
      gaps: filtered,
    });
  } catch (error) {
    console.error('[genome/gaps] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
