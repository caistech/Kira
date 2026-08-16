import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { readDraft } from '@/lib/kira/swarm/drafts';

export const dynamic = 'force-dynamic';

// ONE DRAFT, READ IN FULL — the screen that answers "where is it?" without offering to send it.
//
// ⚠️ THE THREE STATES ARE RENDERED DIFFERENTLY ON PURPOSE, because the whole defect was that they
// looked the same. "Drafted and waiting on your go-ahead" was shown for a task with no body, and for
// a task the orchestrator had REFUSED, and Ray was told over the top of both that it was ready to
// send. A man waits indefinitely on a thing that was declined two hours earlier, and it costs him
// nothing to find out except the trust he had left.

export default async function DraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = await params;

  const authUser = await getAuthUser();
  if (!authUser) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-2xl font-bold">Draft</h1>
        <p className="mt-3 text-stone-600">Sign in to read what Kira has written.</p>
        <Link href="/login" className="mt-6 inline-flex min-h-[44px] items-center text-violet-700 underline underline-offset-4">
          Sign in
        </Link>
      </main>
    );
  }

  const svc = createServiceClient();
  const { data: appUser } = await svc
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (!appUser) notFound();

  // ⚠️ SCOPED TO HIM. readDraft reads only this owner's rows, so a guessed id resolves to nothing
  // rather than to another owner's quote. The same table carries the orchestrator's dev traffic and
  // every other tenant's work.
  const draft = await readDraft(String(appUser.id), draftId);
  if (!draft) notFound();

  const asked =
    draft.ageDays === 0 ? 'asked for today' : `asked for ${draft.ageDays} day${draft.ageDays === 1 ? '' : 's'} ago`;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 pb-28">
      <Link href="/drafts" className="inline-flex min-h-[44px] items-center text-base text-violet-700 underline underline-offset-4">
        ← All drafts
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold">{draft.title}</h1>
      <p className="mt-2 text-base text-stone-500">{asked}</p>

      {/* WHAT HE ASKED FOR, VERBATIM, ALWAYS — and it is the one part of this screen that is always
          real. On both of Ray's tasks the request holds every figure he gave out loud ($118/hr,
          materials at cost plus 22%, mine sites at 28%) while the drafted body holds nothing. Showing
          his own words back is worth more than an apology about the missing document. */}
      <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <h2 className="text-base font-semibold text-stone-900">What you asked for</h2>
        <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-stone-700">{draft.asked}</p>
      </section>

      {draft.readiness === 'ready' && (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-stone-900">What she wrote</h2>
          <div className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-stone-800">{draft.body}</div>
        </section>
      )}

      {draft.readiness === 'no-body' && (
        // ⚠️ SAID PLAINLY, NOT DRESSED UP. She reported this one finished and offered to email it.
        // The honest sentence costs nothing and is the only thing that stops him waiting on it.
        <section className="mt-6 rounded-2xl border border-stone-300 bg-stone-50 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-stone-900">Nothing written yet</h2>
          <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-700">
            Kira has this on her list and has not written it yet. If she has told you it was ready,
            she was wrong — there is no document behind it, and nothing has been sent to anyone. Ask
            her for it again and it will appear here when it exists.
          </p>
        </section>
      )}

      {draft.readiness === 'refused' && (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-stone-900">She could not do this one</h2>
          <p className="mt-2 max-w-prose text-base leading-relaxed text-stone-800">
            {/* The reason, when the row carries one — see refusalReason. "She could not do this one"
                on its own left him asking "why? was it my fault? do I ask again?" */}
            {draft.reason ?? 'This came back as something she cannot do yet.'} It will not happen on
            its own and there is nothing waiting on your approval. Nothing has been sent to anyone.
          </p>
        </section>
      )}

      {/* WHERE SENDING HAPPENS, AND WHY IT IS NOT HERE. Stated rather than left as an absence, so a
          man looking for the button knows he has not missed it. */}
      <p className="mt-8 max-w-prose text-base leading-relaxed text-stone-600">
        Nothing on this page sends anything. When you want something to go to another person, tell
        Kira — she reads it back to you and confirms who it is going to first.
      </p>
      <Link
        href="/talk"
        className="mt-4 inline-flex min-h-[52px] items-center rounded-full bg-stone-900 px-7 py-3.5 text-base font-bold text-white hover:bg-stone-800"
      >
        Talk to Kira about this
      </Link>
    </main>
  );
}
