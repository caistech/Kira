// app/api/genome/query/[area]/route.ts
//
// GET /api/genome/query/[area] — query a specific genome area.
//
// Answers:
//   - "What do we know about pricing?"
//   - "How reliable is our pricing knowledge?"
//   - "What's missing from pricing?"

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { getAreaKnowledgeState } from '@/business-genome/coverage';
import { ONTOLOGY_AREAS } from '@/business-genome/ontology/v1/areas';

export async function GET(
  request: Request,
  { params }: { params: { area: string } }
) {
  try {
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const areaKey = params.area;

    // Validate area key
    const validAreas = ONTOLOGY_AREAS.map((a) => a.key);
    if (!validAreas.includes(areaKey)) {
      return NextResponse.json({ error: `Invalid area: ${areaKey}` }, { status: 400 });
    }

    const state = await getAreaKnowledgeState(ctx.organisationId, areaKey);
    if (!state) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 });
    }

    return NextResponse.json({
      area_key: state.area_key,
      area_name: state.area_name,
      entity_count: state.entity_count,
      fact_count: state.fact_count,
      relationship_count: state.relationship_count,
      confidence_stats: state.confidence_stats,
      status_breakdown: state.status_breakdown,
      source_breakdown: state.source_breakdown,
      oldest_knowledge_days: state.oldest_knowledge_days,
      newest_knowledge_days: state.newest_knowledge_days,
      contradictions: state.contradictions,
      entities: state.entities,
      facts: state.facts,
      relationships: state.relationships,
    });
  } catch (error) {
    console.error('[genome/query/[area]] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
