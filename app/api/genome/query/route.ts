// app/api/genome/query/route.ts
//
// GET /api/genome/query — the Genome Query API.
//
// This is the primary read endpoint for the Business Genome.
// It answers:
//   - "What do we know about this company?"
//   - "How reliable is that knowledge?"
//   - "What don't we know?"
//   - "What should Kira ask next?"
//
// Used by: Orchestrator, agents, reports, valuation, UI projection.

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import {
  getFullKnowledgeState,
  getAreaKnowledgeState,
  generateKnowledgeAssessment,
} from '@/business-genome/coverage';
import { ONTOLOGY_AREAS } from '@/business-genome/ontology/v1/areas';

export async function GET(request: Request) {
  try {
    // Auth: must be the business owner
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const areaKey = searchParams.get('area');
    const includeItems = searchParams.get('include') === 'items'; // include raw entities/facts
    const fullAssessment = searchParams.get('assessment') === 'full'; // full KnowledgeQualityAssessment

    // Full assessment mode — the complete machine-readable output
    if (fullAssessment) {
      const assessment = await generateKnowledgeAssessment(ctx.organisationId);
      return NextResponse.json(assessment);
    }

    // Area-specific query
    if (areaKey) {
      const validAreas = ONTOLOGY_AREAS.map((a) => a.key);
      if (!validAreas.includes(areaKey)) {
        return NextResponse.json({ error: `Invalid area: ${areaKey}` }, { status: 400 });
      }

      const state = await getAreaKnowledgeState(ctx.organisationId, areaKey);
      if (!state) {
        return NextResponse.json({ error: 'Area not found' }, { status: 404 });
      }

      // Optionally include raw items
      const result: Record<string, unknown> = {
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
      };

      if (includeItems) {
        result.entities = state.entities;
        result.facts = state.facts;
        result.relationships = state.relationships;
      }

      return NextResponse.json(result);
    }

    // Default: full knowledge state summary
    const states = await getFullKnowledgeState(ctx.organisationId);
    const summary = states.map((s) => ({
      area_key: s.area_key,
      area_name: s.area_name,
      entity_count: s.entity_count,
      fact_count: s.fact_count,
      relationship_count: s.relationship_count,
      confidence_mean: s.confidence_stats.mean,
      confirmed_count: s.status_breakdown.confirmed,
      candidate_count: s.status_breakdown.candidate,
      contradiction_count: s.contradictions.length,
      oldest_knowledge_days: s.oldest_knowledge_days,
      newest_knowledge_days: s.newest_knowledge_days,
    }));

    return NextResponse.json({
      organisation_id: ctx.organisationId,
      areas: summary,
      total_entities: summary.reduce((s, a) => s + a.entity_count, 0),
      total_facts: summary.reduce((s, a) => s + a.fact_count, 0),
      total_relationships: summary.reduce((s, a) => s + a.relationship_count, 0),
    });
  } catch (error) {
    console.error('[genome/query] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
