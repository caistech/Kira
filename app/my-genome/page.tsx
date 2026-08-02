import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { formatMoney, formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { RedactEntry } from '@/components/RedactEntry';
import { PRIVATE_REASON_LABEL } from '@/lib/genome/private';

export const dynamic = 'force-dynamic';

// The owner's OWN Genome — the thing he is paying for, which until now existed only as a public
// example. The ICP tester's verdict was: "when I got through the door, the thing that had been
// described for ten minutes wasn't in there."
//
// It is deliberately honest about how much is here. Sections with nothing say so, unsorted notes are
// SHOWN rather than hidden, and the empty state explains what would fill it. A Genome padded out to
// look fuller than it is would fail the one test this audience applies: does this thing understand
// my situation, or is it generic software with my industry pasted on.
export default async function MyGenome() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="font-display text-2xl font-bold">Your Business Genome</h1>
        <p className="text-stone-600 mt-3">Sign in to see what Kira has captured about your business.</p>
        <a href="/login" className="mt-6 inline-flex items-center min-h-[44px] text-violet-600 underline underline-offset-4">Sign in</a>
      </main>
    );
  }

  const svc = createServiceClient();
  const { data: appUser } = await svc
    .from('users')
    .select('id, first_name')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (!appUser) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="font-display text-2xl font-bold">Your Business Genome</h1>
        <p className="text-stone-600 mt-3">We could not find your account record. Please contact us.</p>
      </main>
    );
  }

  const g = await deriveOwnerGenome(appUser.id);

  // WHAT HE HAS, FIRST. The areas are held in buyer-priority order, which is right for the handover
  // document and wrong for the first thing he sees: it put empty sections above the ones with his
  // own words in them, so the page opened on a list of things he had not done. Populated areas lead;
  // the empties keep their relative order underneath. Stable sort, so ranking is preserved within
  // each group.
  const sections = [...g.sections].sort(
    (a, b) => Number(b.entries.length > 0) - Number(a.entries.length > 0),
  );
  const populated = g.sections.filter((s) => s.entries.length > 0).length;
  // Approximate, matching the valuation result — the same figure must not be rounded on one screen
  // and exact on another, least of all in the document this page is about.
  const money = (n: number | null) => (n == null ? '—' : formatMoneyApprox(n, DEFAULT_CURRENCY));

  return (
    <main className="max-w-3xl mx-auto px-5 py-10 pb-20">
      <h1 className="font-display text-3xl font-bold">Your Business Genome</h1>
      <p className="text-lg text-stone-600 mt-4 leading-relaxed max-w-2xl">
        Everything Kira has captured about how your business actually runs, organised by the questions
        a buyer&apos;s advisor will ask you. It grows every time you talk to her — there is nothing to
        fill in.
      </p>

      {g.readiness != null && (
        <section
          className="mt-8 rounded-3xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg,#a78bfa,#8b5cf6 60%,#f472b6)' }}
        >
          <div className="flex flex-wrap gap-8 items-baseline">
            <div>
              <p className="text-white/80 text-sm uppercase tracking-wide font-semibold">Worth today</p>
              <p className="font-display text-3xl font-bold">{money(g.worthToday)}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm uppercase tracking-wide font-semibold">Locked in your head</p>
              <p className="font-display text-3xl font-bold">{money(g.gap)}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm uppercase tracking-wide font-semibold">Transferability</p>
              <p className="font-display text-3xl font-bold">{Math.round((g.readiness ?? 0) * 100)}/100</p>
            </div>
          </div>
        </section>
      )}

      {g.empty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-amber-300 p-8 text-center">
          <p className="font-display text-xl font-bold">Nothing captured yet</p>
          <p className="text-stone-600 mt-3 max-w-md mx-auto leading-relaxed">
            This fills in as you talk to Kira — how you price, where your work comes from, what happens
            when you are not there. Have a conversation and come back.
          </p>
          <a
            href="/talk"
            className="mt-6 inline-flex items-center min-h-[48px] px-6 rounded-full text-white font-display font-bold"
            style={{ background: 'linear-gradient(135deg,#fb7185,#f472b6)' }}
          >
            Talk to Kira
          </a>
          <p className="text-sm text-stone-500 mt-6">
            Want to see what a filled-in one looks like?{' '}
            <a href="/genome" className="underline underline-offset-4">See an example</a>.
          </p>
        </div>
      ) : (
        <>
          <p className="text-base text-stone-500 mt-6">
            {/* WHERE those things ARE, not just how many.
                It said "3 things captured" above five sections each reading "Not captured — nothing
                here yet". A tester: "I thought it was broken until I scrolled far enough to find
                them." Nothing was wrong; the header simply gave a count with no shape, so every
                empty section read as a fault rather than as the honest remainder. Naming the number
                of areas makes an empty one expected — and it stays true as the model widens. */}
            {g.totalCaptured} {g.totalCaptured === 1 ? 'thing' : 'things'} captured
            {populated > 0 ? `, across ${populated} of the ${g.sections.length} areas below` : ''}
            {g.documents > 0 ? `, plus ${g.documents} document${g.documents === 1 ? '' : 's'} you have shared` : ''}.
            {/* THE COUNT HAS TO ACCOUNT FOR THE UNDATED ONES, or it reads as a contradiction.
                This said "5 of them are dated to the conversation you said them in — that is what a
                buyer's accountant will want to see", and a tester then scrolled to two entries both
                marked "conversation not recorded". Nothing was untrue; the header simply bragged
                about provenance while the first things he could see denied having any. Naming the
                remainder in the same sentence means finding one is confirmation rather than a catch. */}
            {g.sourced > 0 && (
              <>
                {' '}
                <span className="text-stone-600">
                  {g.sourced} of them are dated to the conversation you said them in — that is what a
                  buyer&apos;s accountant will want to see.
                  {g.totalCaptured > g.sourced
                    ? ` The other ${g.totalCaptured - g.sourced} are marked where they appear.`
                    : ''}
                </span>
              </>
            )}
          </p>

          {/* THE STRONGEST THING ON THE PAGE, and until now it was computed and shown nowhere.
              Dated-to-a-conversation says we know when he said it. Read back and agreed says he
              stood behind it, and that is the difference between a note and evidence a buyer
              cannot wave away.

              WRITTEN TO READ WELL AT ZERO, which is where every owner starts and where most will
              sit for a while: confirmations only began on 2 August and are deliberately not
              backfillable, because a confirmation nobody made is the one lie this document cannot
              survive. So the empty state is an explanation of what is coming, never a score he is
              failing — he does not get a deficiency report on his own business. */}
          <p className="mt-3 text-base">
            {g.confirmed > 0 ? (
              <span className="text-stone-600">
                <span className="font-semibold text-emerald-700">
                  {g.confirmed} {g.confirmed === 1 ? 'has' : 'have'} been read back to you and you
                  agreed.
                </span>{' '}
                That is the strongest form anything here can take — a buyer discounts what you said
                once, and cannot discount what you confirmed.
              </span>
            ) : (
              <span className="text-stone-600">
                Kira has not read any of these back to you yet. She will, as you talk — checking a
                fact with you turns it from something you mentioned into something a buyer can rely
                on, and that is most of what this is worth.
              </span>
            )}
          </p>

          {/* WHO ELSE READS THIS — at the top, where he is looking at the sentence that worries him.
              A tester found "the owner is considering selling the business and has not told anyone"
              sitting on this page and called it the most impressive and most frightening thing he
              saw. His note: an assurance about who can see it "belongs at the top, in the
              explanatory header, not buried in an FAQ on the landing page." */}
          {/* ⚠️ THIS SENTENCE USED TO SAY "Nobody at Corporate AI Solutions reads it." IT WAS NOT TRUE.
              The operator console (/admin/exec → Manage) shows a customer's memory in full sentences,
              which is how support and classification review actually work. A tester found both screens
              in one session and put it plainly: the product makes a promise on one screen that another
              screen in the same product disproves, and the day a customer sees both, he is gone.

              So the promise was changed to the truth rather than the truth to the promise — an
              operator decision, taken knowing this is the weakest of the honest options and that the
              original line was the strongest sentence in the product. What is now claimed is exactly
              what the privacy policy already claimed ("access is limited to those who need it to
              operate the service"), so the two no longer disagree.

              DO NOT restore the absolute wording without first removing operator access to contents.
              The considered version — request, log, and show the owner every look — is the build that
              would earn the original sentence back. */}
          <p className="mt-3 text-base text-stone-600">
            This page is yours. It is never shared with anyone you have referred or been referred by,
            and it is never shown to a buyer — only the handover document is, and that leaves out your
            own position. Our support team can see what Kira has captured when they need to keep the
            service running. Anything here can be taken back — use{' '}
            <span className="font-semibold">Remove</span> on the entry itself.
          </p>

          <div className="mt-6 space-y-3">
            {sections.map((s) => (
              <article key={s.key} className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display font-bold text-lg">{s.title}</p>
                    <p className="text-sm text-stone-500">{s.question}</p>
                  </div>
                  {/* A BAND, not a percentage. Nobody knows how many facts a pricing section
                      "should" contain, so a percentage would put a precise-looking number on a
                      guess — in a document meant to be handed to a buyer. */}
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      s.coverage === 'covered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : s.coverage === 'building'
                          ? 'bg-amber-100 text-amber-800'
                          : s.coverage === 'thin'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {s.coverage === 'covered'
                      ? 'Covered'
                      : s.coverage === 'building'
                        ? 'Building'
                        : s.coverage === 'thin'
                          ? 'Only a start'
                          : 'Not captured'}
                  </span>
                </div>
                <div className="px-5 py-4">
                  {s.entries.length === 0 ? (
                    /* Honest, not decorative. An empty section is information: it is what he is still
                       carrying himself, and it is the reason to keep talking to her. */
                    <p className="text-stone-500">Nothing here yet — this is still only in your head.</p>
                  ) : (
                    <ul className="space-y-3">
                      {s.entries.map((e) => (
                        <li key={e.id}>
                          {/* The headline is what makes this read like a manual rather than a
                              transcript. The detail stays underneath it, unchanged — a buyer's
                              advisor skims the leads and reads the ones that matter. */}
                          {e.headline ? (
                            <p className="font-display font-semibold text-stone-900">{e.headline}</p>
                          ) : null}
                          <p className={`text-stone-800 leading-relaxed${e.headline ? ' text-sm text-stone-600' : ''}`}>
                            {e.content}
                          </p>
                          {/* Sourced to the conversation he said it in — the thing that makes this
                              evidence rather than an assertion when a buyer's accountant reads it. */}
                          <p className="text-xs text-stone-400 mt-1">
                            {e.source
                              ? `You said this on ${new Date(e.source.spokenOn).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`
                              : `Captured ${new Date(e.capturedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })} — conversation not recorded`}
                          </p>
                          {/* On its own line and in a different colour, because it is a different
                              CLAIM rather than more detail about the same one: the line above says
                              when he said it, this one says he heard it back and stood by it. Shown
                              only when true — an "unconfirmed" marker on every other entry would
                              turn a record of his business into a list of things not done yet. */}
                          {e.confirmedOn && (
                            <p className="text-xs font-medium text-emerald-700 mt-0.5">
                              Read back to you and confirmed on{' '}
                              {new Date(e.confirmedOn).toLocaleDateString('en-AU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                          {/* SHOWN TO HIM PRECISELY BECAUSE IT IS HIDDEN FROM THEM.
                              He is the only person who can audit this filter — he knows which
                              sentences would hurt him and we are guessing — so a silent exclusion
                              would be us deciding on his behalf and never telling him. Naming the
                              reason rather than just the fact of it also makes a false positive
                              reportable: "that is not about my plans" is only sayable if he can see
                              what we thought it was. */}
                          {e.privateReason && (
                            <p className="text-xs font-medium text-violet-700 mt-0.5">
                              Yours only — kept out of the handover document, because it touches on{' '}
                              {PRIVATE_REASON_LABEL[e.privateReason]}.
                            </p>
                          )}
                          {/* ASKED, NOT ACTED ON.
                              Above the merge threshold a restatement is collapsed automatically. In
                              the band below it two entries are alike enough to be worth asking about
                              and not alike enough to act on — a tester found two of his three facts
                              saying the same thing in different words — so he is asked rather than
                              having his own record quietly rewritten. Remove is right there if the
                              answer is yes; nothing happens if he ignores it. */}
                          {e.possibleRestatementOf && (
                            <p className="text-xs text-stone-500 mt-0.5">
                              This may be another way of saying something you already told Kira. If it
                              is, remove whichever one reads worse — she will keep the other.
                            </p>
                          )}
                          {/* On the FILED entries too, not only the unsorted ones. The sentence the
                              tester wanted to take back — "considering selling, has not told anyone"
                              — was a filed entry, so a Remove that only reached the loose notes
                              would have missed the exact case it exists for. */}
                          <RedactEntry id={e.id} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>

          {g.stillInYourHead.length > 0 && (
            /* THE MOST VALUABLE THING ON THE PAGE, and the reason the public example is persuasive:
               it names what has NOT been captured. A manual that only shows what it holds lets an
               owner believe he is finished. Naming the gaps turns the Genome from a record into a
               to-do list, and it is the honest answer to "what still walks out the door with you?". */
            <section className="mt-6 rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-5">
              <p className="font-display font-bold text-lg">Still only in your head</p>
              <p className="text-sm text-stone-600 mt-1">
                Kira has not captured anything for these yet. Each one is a question a buyer&apos;s
                advisor will ask, and today only you can answer it.
              </p>
              <ul className="mt-3 space-y-2">
                {g.stillInYourHead.map((sec) => (
                  <li key={sec.key} className="text-stone-700">
                    <span className="font-semibold">{sec.title}</span>
                    <span className="text-stone-500"> — {sec.question}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {g.notYetLocated.length > 0 && (
            /* A SEPARATE LIST, AND THE DIFFERENCE IS THE POINT.
               These areas are empty because nobody has shown Kira where they live — not because the
               owner is carrying them in his head. His depreciation schedule is at the accountant's;
               his insurance certificates are in a filing cabinet. Putting them under "still only in
               your head — today only you can answer it" is a confident falsehood about a man's own
               business, and he knows it is wrong the instant he reads it, which costs more than the
               line is worth.
               So this one asks instead of asserting. Once the location model has real data the two
               lists collapse into one answer per area (GENOME_BUYER_FORMAT §3.3). */
            <section className="mt-6 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-5">
              <p className="font-display font-bold text-lg">Kira hasn&apos;t been shown these yet</p>
              <p className="text-sm text-stone-600 mt-1">
                These usually live in a system, a folder or a filing cabinet rather than in a
                conversation — so they may already be written down somewhere. Tell Kira where they
                are and she&apos;ll take it from there.
              </p>
              <ul className="mt-3 space-y-2">
                {g.notYetLocated.map((sec) => (
                  <li key={sec.key} className="text-stone-700">
                    <span className="font-semibold">{sec.title}</span>
                    <span className="text-stone-500"> — {sec.question}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {g.unsorted.length > 0 && (
            /* Shown, never hidden. A memory the owner gave us that appears nowhere is exactly the
               failure this product exists to prevent. */
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <p className="font-display font-bold">Not yet filed ({g.unsorted.length})</p>
              <p className="text-sm text-stone-500 mt-1">
                Kira has these but has not worked out where they belong yet. They are not lost.
              </p>
              <ul className="mt-3 space-y-2">
                {g.unsorted.slice(0, 10).map((e) => (
                  <li key={e.id} className="text-stone-700">
                    · {e.content}
                    <RedactEntry id={e.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">Take it with you</h2>
            <p className="text-stone-600 mt-2 max-w-2xl leading-relaxed">
              It is yours. Download a copy whenever you like — if you stop paying us, you keep it.
            </p>
            {/* THE TWO FILES ARE NOT THE SAME FILE, and he has to know that before he forwards one.
                The handover document is the one built to be sent on, so it leaves out anything about
                your own position; the raw data is everything we hold, for you. Saying so here, next
                to the buttons, is the moment it matters — a note further up the page is a note he
                has already scrolled past by the time he clicks. */}
            <p className="text-stone-600 mt-2 max-w-2xl leading-relaxed">
              They are different files on purpose. The{' '}
              <span className="font-semibold">handover document</span> is the one built to be sent to
              an advisor or a buyer, so it covers the business and leaves out anything marked{' '}
              <span className="font-semibold text-violet-700">yours only</span> above. The{' '}
              <span className="font-semibold">raw data</span> is everything we hold, including those —
              that one is for you.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/api/genome/export?format=md"
                className="inline-flex items-center min-h-[48px] px-6 rounded-full border border-stone-300 font-display font-semibold"
              >
                Download the handover document
              </a>
              <a
                href="/api/genome/export?format=json"
                className="inline-flex items-center min-h-[48px] px-6 rounded-full border border-stone-300 font-display font-semibold"
              >
                Download the raw data
              </a>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
