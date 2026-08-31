// app/api/genome/quality/route.ts
//
// GET /api/genome/quality — the Genome Quality Assessment.
//
// Answers:
//   - "How good is our knowledge?" (overall score 0-100)
//   - "What are the quality dimensions?" (per-item assessment)
//   - "Where are the weak spots?" (per-area breakdown)
//
// This is the primary endpoint for understanding knowledge reliability.

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import {
  calculateQualityMetrics,
  generateKnowledgeAssessment,
} from '@/business-genome/coverage';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fullAssessment = searchParams.get('full') === 'true';

    if (fullAssessment) {
      // Full KnowledgeQualityAssessment — the machine-readable output
      const assessment = await generateKnowledgeAssessment(ctx.organisationId);
      return NextResponse.json(assessment);
    }

    // Quality metrics only — lighter response
    const metrics = await calculateQualityMetrics(ctx.organisationId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('[genome/quality] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
