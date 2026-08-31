// app/api/genome/confirm/route.ts
//
// POST /api/genome/confirm — confirm a genome fact or entity.
//
// The owner confirms a fact is correct. This moves it from 'candidate' to 'confirmed'
// and increases its quality score.
//
// Canonical model:
//   - organisationId = resource ownership scope
//   - personId = actor / provenance (who confirmed)

import { NextResponse } from 'next/server';
import { getCurrentOrganisationContext } from '@/lib/auth';
import { confirmFact, confirmEntity } from '@/business-genome/repository';

export async function POST(request: Request) {
  try {
    const ctx = await getCurrentOrganisationContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    if (type === 'fact') {
      const confirmed = await confirmFact(id, ctx.organisationId, ctx.personId);
      return NextResponse.json({ success: true, fact: confirmed });
    }

    if (type === 'entity') {
      const confirmed = await confirmEntity(id, ctx.organisationId, ctx.personId);
      return NextResponse.json({ success: true, entity: confirmed });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('[genome/confirm] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
