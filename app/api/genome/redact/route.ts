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
// MNEMO IS REACHED BY THIS. It was not, at first, and the gap is worth keeping written down: a fact
// is dual-written to the semantic lane, so parking the Postgres row removed it from the Genome, his
// recall and his export — everywhere he could look — and left it reachable by semantic recall. He
// would have taken the line back from everything he could see and been wrong, which for the one
// feature whose entire purpose is that he controls what is kept is worse than not offering it.
//
// The removal is exact-matched rather than top-hit, and reported honestly when it does not happen —
// see the semantic-forget block below.

import { NextRequest, NextResponse } from 'next/server';

import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { mnemoForget } from '@/lib/kira/mnemo';
import { restatementCluster } from '@/lib/genome/similar';

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
    .select('id, content');

  if (error) {
    console.error('[genome/redact] failed:', error.message);
    return NextResponse.json({ error: 'Could not update that entry' }, { status: 500 });
  }

  // THE OTHER PHRASINGS. The same fact told in two conversations is stored twice, differently
  // worded, and the Genome shows only one of them — so parking the row he clicked would take away
  // the sentence he saw and leave its restatement behind, ready to surface in its place. He would
  // have watched the line disappear, believed it gone, and been wrong. For the one feature whose
  // entire purpose is that he decides what is kept, that is worse than not offering it.
  //
  // Transitive, via restatementCluster: A restates B, B restates C, and A may not reach C directly.
  // Parking only direct matches leaves a sentence saying the thing he just took back.
  //
  // Scoped to his own rows in the query. Never on restore — bringing one line back should not drag
  // in everything that resembles it, because he is choosing that one sentence, not a topic.
  let alsoParked = 0;
  const parkedRow = (data ?? [])[0] as { content?: string } | undefined;
  if (parkedRow?.content && body.restore !== true) {
    const { data: siblings } = await svc
      .from('kira_memory')
      .select('id, content')
      .eq('user_id', user.id)
      .neq('active', false)
      .neq('id', id);
    const cluster = restatementCluster(String(parkedRow.content), (siblings ?? []) as { id: string; content: string }[], (r) =>
      String(r.content ?? ''),
    );
    for (const dup of cluster) {
      const { error: dupError } = await svc
        .from('kira_memory')
        .update({ active: false, parked_reason: 'owner:redacted-restatement' })
        .eq('id', dup.id)
        .eq('user_id', user.id);
      if (dupError) console.error('[genome/redact] restatement not parked:', dup.id, dupError.message);
      else alsoParked += 1;
      // The semantic copy of each restatement goes too, for the same reason the primary one does.
      try {
        await mnemoForget(user.id, String(dup.content ?? ''));
      } catch (mnemoError) {
        console.error('[genome/redact] semantic forget threw for restatement:', mnemoError);
      }
    }
  }
  // THE OTHER COPY. save_memory dual-writes — the fact goes into kira_memory AND into Mnemo, the
  // semantic recall lane — so parking the row alone left it reachable. He would have taken it back
  // from everything he can see and been wrong.
  //
  // Gated on an exact normalised match rather than the top hit, because Mnemo search is SEMANTIC and
  // the nearest neighbour of a fact about his business is another fact about his business (see
  // lib/kira/mnemo.ts). And reported honestly: `semanticRemoved` is only true when a copy was found
  // AND removed. Not-found and would-not-go are different from done, and both are returned as
  // false rather than dressed up.
  let semanticRemoved = false;
  if (parkedRow?.content && body.restore !== true) {
    try {
      const { matched, forgotten } = await mnemoForget(user.id, String(parkedRow.content));
      semanticRemoved = matched > 0 && forgotten === matched;
      if (matched > forgotten) {
        console.warn(`[genome/redact] ${matched - forgotten} semantic copy(ies) survived for ${id}`);
      }
    } catch (error) {
      // Never fails the redaction. The Genome copy IS parked by this point, which is the part he can
      // see; losing the semantic delete is a smaller harm than telling him the whole thing failed.
      console.error('[genome/redact] semantic forget threw (row is parked):', error);
    }
  }

  // No rows means it was not his. Answered the same way as a success, deliberately: telling a
  // caller "that id exists but is not yours" is a membership oracle over other people's Genomes.
  // `alsoParked` is reported rather than hidden: if taking one line back removed three sentences, he
  // is entitled to know that, and a silent extra deletion in the feature built on trust is the last
  // place to be quiet about scope.
  return NextResponse.json({ ok: true, changed: (data ?? []).length, semanticRemoved, alsoParked });
}
