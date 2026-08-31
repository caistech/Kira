// app/api/kira/draft/create/route.ts
// Text fallback for Setup Kira onboarding: when a user can't (or would rather not) talk, they type a
// short brief here instead of speaking to the voice agent. We insert the same kira_drafts row the
// save-framework-draft voice webhook writes, then the client sends them to /setup/draft/[id] to
// review + create — so the typed path and the voice path converge on the identical review screen.
//
// /start is auth-gated (middleware USER_PROTECTED), so a session is present; identity is derived from
// it, never trusted from the body.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentOrganisationContext } from '@/lib/auth';

export async function POST(req: NextRequest) {
  // INV-020: kira_drafts is organisation-owned (organisation_id NOT NULL after the 20260830
  // migration). Identity is derived from the session, never trusted from the body.
  const organisationContext = await getCurrentOrganisationContext();
  if (!organisationContext) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userName = String(body.user_name || '').trim();
  const location = String(body.location || '').trim();
  const journeyType = body.journey_type === 'business' ? 'business' : 'personal';
  const primaryObjective = String(body.primary_objective || '').trim();

  if (!userName || !location || !primaryObjective) {
    return NextResponse.json(
      { error: 'Please add your name, your location, and what you want to work on.' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data: draft, error } = await supabase
    .from('kira_drafts')
    .insert({
      organisation_id: organisationContext.organisationId,
      user_name: userName,
      first_name: userName.split(' ')[0],
      location,
      journey_type: journeyType,
      primary_objective: primaryObjective,
      key_context: Array.isArray(body.key_context) ? body.key_context : [],
      success_definition: body.success_definition ? String(body.success_definition) : null,
      constraints: Array.isArray(body.constraints) ? body.constraints : [],
      status: 'draft',
      // Not from a voice call. A synthetic, unique marker keeps the /start voice poll (which can
      // fall back to a time window) from ever surfacing this typed draft to a concurrent voice user;
      // the text flow navigates straight to /setup/draft/[id] and never relies on the poll.
      elevenlabs_conversation_id: `text:${randomUUID()}`,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[draft/create] insert failed:', error);
    return NextResponse.json({ error: 'Could not save your brief. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ draftId: draft.id });
}
