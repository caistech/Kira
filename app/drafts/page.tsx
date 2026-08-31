import Link from 'next/link';

import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { KiraShapeSection } from '@/components/KiraShapeSection';
import { readDrafts, type DraftItem } from '@/lib/kira/swarm/drafts';

export const dynamic = 'force-dynamic';

// THE PAGE THAT DID NOT EXIST, AND WHOSE ABSENCE MADE HER SOUND LIKE SHE WAS HIDING SOMETHING.
//
// Ray asked her to write up his pricing. She said she had. He asked where it was, and she offered to
// EMAIL it and asked him for a recipient's address — to a man who had told her in the same
// conversation that nobody knows he is selling.
//
//   "I asked to read it. She offered to send it… And there is nowhere in the app to read a draft.
//    The dashboard lists it with a button that says 'Talk to Kira about these', which takes me back
//    to the chat, which offers to email it. The document exists somewhere and I cannot look at it."
//
// It did not exist anywhere. Both of his tasks hold an empty artifact, and the second was refused by
// the orchestrator as unsupported while he was being told it was ready to send.
//
// ⚠️ NO SEND CONTROL HERE, DELIBERATELY — and that is not the same as leaving him stuck. Approving a
// real email to a real client happens in conversation, where she reads it back and confirms the
// recipient out loud; a second send path on a screen used at the end of a long day would bypass the
// confirmation that makes the first one safe. What was missing was never the send button. It was the
// reading.

function stateLine(draft: DraftItem): { text: string; tone: 'ready' | 'waiting' | 'refused' } {
  if (draft.readiness === 'refused') {
    return { text: 'She could not do this one', tone: 'refused' };
  }
  if (draft.readiness === 'ready') return { text: 'Ready to read', tone: 'ready' };
  return { text: 'Asked for — nothing written yet', tone: 'waiting' };
}

const TONE: Record<'ready' | 'waiting' | 'refused', string> = {
  ready: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  waiting: 'bg-stone-100 text-stone-700 border-stone-200',
  refused: 'bg-amber-50 text-amber-900 border-amber-200',
};

export default async function DraftsPage() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-display text-2xl font-bold">Drafts</h1>
        <p className="mt-3 text-stone-600">Sign in to see what Kira has been asked to write.</p>
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

  const { data: membership } = await svc
    .from('organisation_memberships')
    .select('organisation_id')
    .eq('person_id', appUser?.id)
    .eq('status', 'active')
    .maybeSingle();

  const drafts = membership ? await readDrafts(String(membership.organisation_id)) : [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 pb-28">
      <h1 className="font-display text-3xl font-bold">Drafts</h1>
      {/* The explanatory header (§5): what it is, what to do, why it matters — and the honest
          boundary, said before he goes looking for a send button that is not here. */}
      <p className="mt-3 max-w-prose text-lg leading-relaxed text-stone-600">
        Everything you have asked Kira to write, and whether there is anything to read yet. Open one
        to read it in full. Sending anything to another person is still done by talking to her, so
        she can read it back and confirm who it is going to before it leaves.
      </p>

      {/* ⚠️ AND HERE SHE IS, so "done by talking to her" is not an instruction to go somewhere else.
          The paragraph above tells him sending happens in conversation; before this, the nearest
          conversation was a floating pill in the corner or a trip back to Overview. */}
      <KiraShapeSection surface="drafts" />

      {drafts.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-base text-stone-700">
          Nothing asked for yet. When you ask Kira to write something up — a summary, a quote, a note
          to a client — it will appear here, and you will be able to read it before anything is sent.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {drafts.map((draft) => {
            const state = stateLine(draft);
            return (
              <li key={draft.id}>
                <Link
                  href={`/drafts/${draft.id}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-violet-300"
                >
                  {/* ⚠️ THE TITLE IS THE LINK. His words: "every draft needs a title you can click
                      that opens the text". It was previously a line of text beside a button that
                      took him back to the chat. */}
                  <p className="text-lg font-semibold text-stone-900">{draft.title}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span className={`rounded-full border px-2.5 py-0.5 font-medium ${TONE[state.tone]}`}>
                      {state.text}
                    </span>
                    <span className="text-stone-500">
                      asked {draft.ageDays === 0 ? 'today' : `${draft.ageDays} day${draft.ageDays === 1 ? '' : 's'} ago`}
                    </span>
                  </p>
                  {/* ⚠️ THE REASON ON THE LIST, not only on the page behind it. He read three rows
                      saying "She could not do this one" and had to open each to find out whether it
                      was his fault. */}
                  {draft.reason && (
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-stone-600">{draft.reason}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
