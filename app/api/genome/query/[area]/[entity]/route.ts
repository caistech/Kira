// app/api/genome/query/[area]/[entity]/route.ts
//
// GET /api/genome/query/[area]/[entity] — query a specific entity in an area.
//
// Answers:
//   - "What do we know about Sarah?"
//   - "How reliable is our knowledge about Xero?"
//   - "What facts do we have about ABC Plumbing?"

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import {
  findEntity,
  getFactsByEntity,
  getRelationshipsByEntity,
} from '@/business-genome/repository';
import { assessItemQuality } from '@/business-genome/coverage';
import { ONTOLOGY_AREAS } from '@/business-genome/ontology/v1/areas';

export async function GET(
  request: Request,
  { params }: { params: { area: string; entity: string } }
) {
  try {
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const areaKey = params.area;
    const entityName = decodeURIComponent(params.entity);

    // Validate area key
    const validAreas = ONTOLOGY_AREAS.map((a) => a.key);
    if (!validAreas.includes(areaKey)) {
      return NextResponse.json({ error: `Invalid area: ${areaKey}` }, { status: 400 });
    }

    // Find entity by name in this area (search all entity types)
    const entityTypes = ['person', 'organisation', 'system', 'asset', 'vehicle', 'equipment',
      'property', 'licence', 'insurance', 'pricing_rule', 'cost_category', 'process',
      'service', 'insight', 'preference', 'correction', 'document', 'financial_account', 'role'];

    let foundEntity = null;
    for (const type of entityTypes) {
      const entity = await findEntity(ctx.organisationId, type, entityName);
      if (entity && entity.area_key === areaKey) {
        foundEntity = entity;
        break;
      }
    }

    if (!foundEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Get facts about this entity
    const facts = await getFactsByEntity(ctx.organisationId, foundEntity.id);

    // Get relationships involving this entity
    const relationships = await getRelationshipsByEntity(ctx.organisationId, foundEntity.id);

    // Assess quality
    const allItems = [foundEntity, ...facts, ...relationships];
    const qualityAssessment = assessItemQuality(foundEntity, allItems as any, 0);

    return NextResponse.json({
      entity: foundEntity,
      facts,
      relationships,
      quality: qualityAssessment,
    });
  } catch (error) {
    console.error('[genome/query/[area]/[entity]] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
