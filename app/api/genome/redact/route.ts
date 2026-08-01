// app/api/genome/redact/route.ts
//
// Take one line back.
//
// WHY THIS EXISTS. A naive tester opened his Genome four minutes into using the product and found
// "the owner is considering selling the business after running it for 35 years but has not told
// anyone about this plan yet" already sitting there. He called it the most impressive and the most
// frightening thing he saw, and then:
//
//   "There's no way to delete or redact a single captured item. I looked. I can download everything
//    and I can delete my whole account, and there is nothing in between. The first thing an owner in
//    my position wants, the very first time he sees a sentence like that on screen, is a way to take
//    that one line back."
//
// Export-everything and delete-everything are not a substitute. This is a man typing the most
// sensitive sentence of his working life into a browser tab in a room with other people in it, and
// the gap between those two options is the difference between using the product at his desk and only
// at home at night.
//
// PARKED, NOT DELETED. active=false takes it out of the Genome, out of recall, and out of the
// handover export — everywhere it is read — while leaving the row recoverable if he changes his mind
// or clicks the wrong one. Same mechanism the entity guard uses. Deleting outright would be the only
// irreversible action in the product reachable in one click.
//
// ⚠️ Mnemo is NOT reached by this. A fact dual-written to the semantic lane stays there, so a
// redaction here is not yet a complete erasure — see the note below. Recorded rather than glossed.

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentAppUser();
  if (!user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: { id?: unknown; restore?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const id = String(body.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const svc = createServiceClient();

  // SCOPED TO HIM, in the update itself rather than by a read-then-write. A check that fetches the
  // row, compares the owner and then writes has a gap between the two; putting user_id in the
  // predicate means another owner's id simply matches nothing.
  const { data, error } = await svc
    .from('kira_memory')
    .update(
      body.restore === true
        ? { active: true, parked_reason: null }
        : { active: false, parked_reason: 'owner:redacted' },
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    console.error('[genome/redact] failed:', error.message);
    return NextResponse.json({ error: 'Could not update that entry' }, { status: 500 });
  }
  // No rows means it was not his. Answered the same way as a success, deliberately: telling a
  // caller "that id exists but is not yours" is a membership oracle over other people's Genomes.
  return NextResponse.json({ ok: true, changed: (data ?? []).length });
}
