import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { KiraShapeSection } from '@/components/KiraShapeSection';
import { buildGenomeOverviewFirstMessage } from '@/lib/kira/area-focus';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { ShareGenome } from '@/components/ShareGenome';
import { GenomeBuckets } from '@/components/GenomeBuckets';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { longDateIn, timeZoneForState } from '@/lib/business-identity';
import { formatMoney, formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { displayedFigures } from '@/lib/valuation/displayed';
import { RedactEntry } from '@/components/RedactEntry';
import { PRIVATE_REASON_LABEL } from '@/lib/genome/private';
import { WHO_CAN_SEE_IT } from '@/lib/privacy';
import { readGenomeViews } from '@/lib/genome/access-log';
import { keyRiskFollowUp } from '@/lib/kira/key-risk';
import { buyerEntryCount } from '@/lib/genome/buyer-view';

export const dynamic = 'force-dynamic';

// ⚠️ SHE IS STILL FILING, AND THE PAGE HAS TO SAY SO.
//
// Distillation happens after the call ends and takes a few minutes. Ray finished talking, came
// straight here, and every area read "Nothing yet" — with the zero-state copy telling him this was
// expected BEFORE his first conversation, which he had just had. "She had just told me she had got
// it. The page said she had not. I only found out it works because I came back later for an
// unrelated reason. Most owners will not come back later — they will conclude it does not work,
// which is exactly what I concluded for about twenty minutes."
//
// ⚠️ started_at, NOT ended_at — AND THAT IS THE WHOLE CORRECTNESS OF THIS CHECK.
//
<<<<<<< HEAD
// `conversations.ended_at` exists in the schema and NOTHING IN THIS CODEBASE EVER WRITES IT. A
// version of this keyed on it typechecked, built, and could never once have been true — the same
// class as the three guards found dead this week, and it would have shipped as a fix for a
// finding it silently did nothing about. `started_at` defaults to NOW() on insert, so it is the
// only timestamp here that is real.
=======
// ⚠️ CORRECTED 2026-08-18. This comment used to say `ended_at` is never written by anything in this
// codebase. That was wrong, and it had been wrong for a while: the canonical post-call handler DOES
// write it, verified on every voice row in the table. The conclusion survives the correction, but
// for a sharper reason than the one originally given, and the sharper reason is the point.
//
// `ended_at` is written for VOICE conversations only. The typed transport never sets it — and text
// is the overwhelming majority of real traffic: of the 71 conversations recorded in the days around
// this fix, 68 were text. So a check keyed on `ended_at` would work correctly for voice users and be
// silently, permanently false for everyone who types. That is worse than a check that never fires at
// all, because it fires often enough to look alive while the people it fails are invisible — and
// this product has already shipped one beta tester who never made a single voice call.
//
// `started_at` defaults to NOW() on insert and is present on every row of both transports, which is
// what makes it the right key rather than merely the safe one.
>>>>>>> fix/purity-lint-gate-red
//
// Twenty-five minutes, measured from the START: the call itself is part of the wait, and a long
// first conversation runs to twenty. Wide enough to cover talk-plus-distil, short enough that it
// stops claiming she is busy on a page opened the next morning.
//
// OUTSIDE THE COMPONENT because it reads the clock. Calling an impure function during render is a
// lint error (react-hooks/purity) and, once this page is ever memoised, a real staleness bug — the
// same reason `sendingLooksStuck` sits outside the dashboard component. It lived in the render body
// from 2026-08-16 and was the single error that turned the whole portfolio-gate run red, which took
// Tests, the chrome check, voice-reachability, design-tokens and Build down with it for two days.
const FILING_WINDOW_MS = 25 * 60 * 1000;

function isStillFiling(startedAt: string | null | undefined): boolean {
  if (!startedAt) return false;
  return Date.now() - new Date(startedAt).getTime() < FILING_WINDOW_MS;
}

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

  // The freshness window and the clock read both live above the component — see isStillFiling.
  const { data: lastConversation } = await svc
    .from('conversations')
    .select('started_at')
    .eq('user_id', appUser.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const justTalked = isStillFiling(lastConversation?.started_at as string | null);
  const identity = await getBusinessIdentity(appUser.id);
  // The same zone the handover document formats in, so the two cannot print different days.
  const timeZone = timeZoneForState(identity?.state);
  // Scoped to HIS id from the session — this table names operators, so an id from anywhere else
  // would let one owner enumerate who works here.
  const views = await readGenomeViews(String(appUser.id));

  // ⚠️ THE PILE, RISK FIRST. Same rules that make her stop mid-conversation (lib/kira/key-risk.ts),
  // so what the page flags and what she says cannot drift apart. Stable within each group, so the
  // order he saw last time is otherwise preserved.
  const rankedUnsorted = [...g.unsorted].sort(
    (a, b) => Number(Boolean(keyRiskFollowUp(b.content))) - Number(Boolean(keyRiskFollowUp(a.content))),
  );

  // WHAT HE HAS, FIRST. The areas are held in buyer-priority order, which is right for the handover
  // document and wrong for the first thing he sees: it put empty sections above the ones with his
  // own words in them, so the page opened on a list of things he had not done. Populated areas lead;
  // the empties keep their relative order underneath. Stable sort, so ranking is preserved within
  // each group.
  const sections = [...g.sections].sort(
    (a, b) => Number(b.entries.length > 0) - Number(a.entries.length > 0),
  );
  const populated = g.sections.filter((s) => s.entries.length > 0).length;
  // ⚠️ ASK FOR THE SET, NEVER ROUND A VALUATION FIGURE HERE. `displayedFigures` derives the gap
  // FROM the rounded pair, so `potential − today` is true in the numbers actually printed. Rounding
  // the stored gap independently is what put $184,000 on this page under $190,000 on the dashboard
  // and the result page — the same figure with two values, on the product whose whole pitch is
  // telling him what his business is worth. Ray found it twice: once on 7 August (which is why
  // lib/valuation/displayed.ts exists) and again on 16 August, because the fix reached three screens
  // and not this one. Fixing the instance instead of the class is how it came back.
  const figures = displayedFigures(
    { worthToday: g.worthToday ?? 0, worthPotential: (g.worthToday ?? 0) + (g.gap ?? 0) },
    DEFAULT_CURRENCY,
  );
  const money = (n: number | null) => (n == null ? '—' : formatMoneyApprox(n, DEFAULT_CURRENCY));

  return (
    <main className="max-w-3xl mx-auto px-5 py-10 pb-20">
      <h1 className="font-display text-3xl font-bold">Your Business Genome</h1>
      {/* SHARE, at the top with the title, because it is the reason the document exists.
          "Kira is a PROJECT, not a subscription — extraction is a migration; her job is to make
          herself redundant." The moment this leaves for a broker or an accountant is the moment the
          product has done what it promised, so the control belongs beside the heading rather than
          buried under three hundred entries. */}
      {/* ⚠️ DO NOT LET HIM SEND A HALF-FILED DOCUMENT TO A BROKER.
          Classification runs after the conversation, so a copy downloaded in the first few minutes
          shows his facts in a loose list under nine section headings that all read "Nothing recorded
          here yet." The facts ARE there and they DO get filed — he simply took the copy too early.

          Ray, 2026-08-17: "My broker will open this, see nine empty headings and a jumble
          underneath, and conclude the exercise has not started. It has. It just has not been filed."

          Said next to the controls that produce the document, because that is the only moment it can
          change what he does. */}
      {g.unsorted.length > 0 && (
        <p className="mt-4 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-stone-800">
          {g.unsorted.length} {g.unsorted.length === 1 ? 'fact is' : 'facts are'} still being sorted
          into the nine areas. They are in the document either way — under &ldquo;other things the
          owner has told us&rdquo; rather than in their section. If you are sending it to someone,
          it is worth waiting a few minutes and taking a fresh copy.
        </p>
      )}

      {/* ⚠️ THE DOCUMENT IS TITLED "This business" UNTIL HE TELLS US OTHERWISE, AND HE SHOULD FIND
          THAT OUT HERE RATHER THAN FROM HIS BROKER.
          The fallback is deliberate — a handover document must never be titled with a person's name
          (that shipped once, and Ray was about to send a broker a file called "Ray") — but a man who
          has never been asked has no idea the fallback is what he is about to send.

          "The document is titled 'This business'. That's the heading. Not my company's name — she
           never asked me for it, not once, in setup or in conversation… I would not send that to a
           man I want to take me seriously. I'd be embarrassed."

          Said on the screen that carries the download and the Share button, which is the only place
          it can be acted on in ten seconds. Not a block: the document is still his to take. */}
      {!identity?.trading_name?.trim() && !identity?.legal_name?.trim() && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-stone-800">
          The handover document is headed <strong>&ldquo;This business&rdquo;</strong> — we have not
          been told the trading name.{' '}
          <a href="/setup/business" className="font-semibold text-violet-700 underline underline-offset-4">
            Add your business details
          </a>{' '}
          and it will carry the name and ABN instead.
        </p>
      )}

      <div className="mt-4">
        <ShareGenome
          businessName={identity?.trading_name?.trim() || identity?.legal_name?.trim() || null}
          ownerName={(appUser.first_name as string | null) ?? null}
          hasDocument={!g.empty}
          /* The count that survives the privacy filter — NOT g.totalCaptured. A Genome that is
             entirely "yours only" is a full record and an empty attachment, and the covering note
             claims otherwise. buyerView is the same function the document itself uses. */
          buyerEntries={buyerEntryCount({ sections: g.sections, unsorted: g.unsorted })}
        />
      </div>
      <p className="text-lg text-stone-600 mt-4 leading-relaxed max-w-2xl">
        Everything Kira has captured about how your business actually runs, organised by the questions
        a buyer&apos;s advisor will ask you. It grows every time you talk to her — there is nothing to
        fill in.
      </p>

      {/* ⚠️ "IT GROWS EVERY TIME YOU TALK TO HER" — SAID ON A PAGE WITH NOWHERE TO TALK TO HER.
          That sentence sat directly above nine funnels showing how little she holds, and the only
          way to act on it was a floating pill in the corner or a text link further down. The page
          named the mechanism and withheld it. She belongs here more than almost anywhere else in
          the product: this is the screen that tells him what is still missing. */}
      {/* ⚠️ SHE OPENS ON THE GAPS, NOT ON THE LIVE JOB. Without an opener she picks up whatever was
          raised last, and the last thing is always the current job — measured on the operator's own
          account, the same plumbing quote three days running while people, assets and customers held
          nothing a buyer asks about. On the page whose entire purpose is showing him those gaps,
          that is the defect in one sentence. The opener names which areas are thin and stops; she
          calls `area_agenda` for whichever he picks and asks the real questions herself. */}
      <KiraShapeSection
        surface="my-genome"
        firstMessage={
          buildGenomeOverviewFirstMessage(g.sections, appUser.first_name as string | undefined) ?? undefined
        }
      />

      {g.readiness != null && (
        <section
          className="mt-8 rounded-3xl p-6 text-white"
          style={{ background: 'linear-gradient(135deg,#a78bfa,#8b5cf6 60%,#f472b6)' }}
        >
          <div className="flex flex-wrap gap-8 items-baseline">
            <div>
              <p className="text-white/80 text-sm uppercase tracking-wide font-semibold">Worth today</p>
              <p className="font-display text-3xl font-bold">{g.worthToday == null ? '—' : figures.todayText}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm uppercase tracking-wide font-semibold">Locked in your head</p>
              <p className="font-display text-3xl font-bold">{g.gap == null ? '—' : figures.gapText}</p>
            </div>
            <div>
              <p className="text-white/80 text-sm uppercase tracking-wide font-semibold">Transferability</p>
              <p className="font-display text-3xl font-bold">{Math.round((g.readiness ?? 0) * 100)}/100</p>
            </div>
          </div>
        </section>
      )}

      {/* THE NINE AREAS, ABOVE THE EMPTY/NOT-EMPTY FORK — and the placement is the fix.
          This block was written INSIDE the non-empty branch, so an owner with nothing captured saw
          "Nothing captured yet" and no map at all. That is exactly backwards: the buckets are MOST
          useful when empty, because empty is when they are a picture of what is missing rather than
          a report on what is held. Every account walked during testing hit that branch, which is why
          the operator asked three times where the visual was — it was mounted and unreachable.
          Above the fork, it cannot happen again. */}
      <div className="mt-8">
        <GenomeBuckets
          sections={g.sections.map((sec) => ({
            key: sec.key,
            title: sec.title,
            coverage: sec.coverage,
            baseline: sec.baseline
              ? { statement: sec.baseline.statement, ownerDependent: sec.baseline.ownerDependent }
              : null,
          }))}
          heading="Where the value is locked up"
          /* The way in. Set HERE and deliberately not on /sample-genome, whose funnels describe an
             invented business — linking those through would open a real owner's empty bucket from a
             page selling a finished one. */
          areaHref="/my-genome"
          unfiledCount={g.unsorted.length}
          stillFiling={justTalked}
        />
      </div>

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
            <a href="/sample-genome" className="underline underline-offset-4">See an example</a>.
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
            {populated > 0
              ? `, across ${populated} of the ${g.sections.length} areas below`
              : /* ⚠️ SAY WHERE THEY ARE WHEN THE ANSWER IS "NOWHERE YET". With populated at zero this
                   clause used to vanish, leaving "8 things captured" above nine areas all reading
                   "Not captured" and a separate box headed "Not yet filed (8)". Three true statements
                   that read as a contradiction. */
                g.unsorted.length > 0
                ? ', none of them filed into an area yet — Kira does that once she is sure where each belongs'
                : ''}
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
          {/* SINGLE-SOURCED WITH WHAT KIRA SAYS OUT LOUD (lib/privacy.ts WHO_CAN_SEE_IT).
              This sentence and her spoken answer had drifted apart: she was telling owners "no one
              else — no accountant, no staff, no one" while this line said the support team can see
              it. The page was the honest one, which is why the page's words are now the source and
              the prompt consumes them rather than the reverse. Do not inline it back. */}
          <p className="mt-3 text-base text-stone-600">
            This page is yours. It is never shared with anyone you have referred or been referred by,
            and it is never shown to a buyer — only the handover document is, and that leaves out your
            own position. {WHO_CAN_SEE_IT} Anything here can be taken back — use{' '}
            <span className="font-semibold">Remove</span> on the entry itself.
          </p>

          {/* ⚠️ THE HALF OF THAT SENTENCE THAT WAS MISSING — and the block above names this exact
              build as "the considered version… that would earn the original sentence back".

              Ray, 2026-08-16: "I accept that, but I'd want a page that lists it — who looked, and
              when. For a man who hasn't told his wife yet, 'someone might look' without 'here's when
              they did' is the sort of thing I'd lie awake on."

              ⚠️ IT STATES ITS OWN SCOPE. It lists operator views of this record and nothing else, and
              says so — a log that implies completeness it cannot deliver is worse than none, because
              the reader then trusts an empty list. The empty state is deliberately NOT "nobody has
              ever looked at your data": it is "nobody has opened this record", which is what the
              rows actually establish. */}
          <div className="mt-5 border-t border-stone-200 pt-4">
            <h3 className="text-base font-semibold text-stone-900">Who has opened your record</h3>
            {views.length === 0 ? (
              <p className="mt-1 max-w-prose text-base text-stone-600">
                Nobody at our end has opened it. If anyone does, it is listed here with the date —
                every time, automatically.
              </p>
            ) : (
              <>
                <p className="mt-1 max-w-prose text-base text-stone-600">
                  Every time someone at our end opens your record, it is listed here.
                </p>
                <ul className="mt-3 space-y-1 text-base text-stone-700">
                  {views.map((view) => (
                    <li key={`${view.viewedBy}-${view.viewedAt}`}>
                      <span className="font-medium text-stone-900">{view.viewedBy}</span>{' '}
                      <span className="text-stone-500">
                        · {new Date(view.viewedAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone })}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {sections.map((s) => (
              <article key={s.key} className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display font-bold text-lg">{s.title}</p>
                    <p className="text-sm text-stone-500">{s.ownerQuestion}</p>
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
                    /* LOCATED, NOT EMPTY. §3.2's rule, made true on day one.
                       An authenticated walkthrough found all nine areas blank on a live account,
                       while the owner's own answers about where his systems live sat unread in the
                       valuation he completed before paying. This shows him what we already know —
                       clearly marked as HIS answer rather than something Kira captured, because
                       presenting a self-report as a captured fact is the same overclaim that put
                       her own meta-notes in his Genome in the first place.
                       The old single line — "this is still only in your head" — was also wrong for
                       four of the nine: an asset register is at the accountant's, not in his head,
                       and being told otherwise is the confident-wrong that costs trust in the parts
                       that are right. */
                    s.baseline ? (
                      <div className="space-y-2">
                        <p className="text-stone-700 leading-relaxed">{s.baseline.statement}</p>
                        <p className="text-xs text-stone-400">
                          From the answers you gave before signing up — not something Kira has captured yet.
                          {s.baseline.location === 'head'
                            ? ' Talk to her and this becomes part of your Genome.'
                            : ' Show her where it lives and she can bring it in.'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-stone-500">
                        Nobody has shown Kira where this lives yet.
                      </p>
                    )
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
                          {/* Sourced to the conversation it came out of — the thing that makes this
                              evidence rather than an assertion when a buyer's accountant reads it.

                              ⚠️ THIS LINE USED TO SAY "You said this on <date>", AND IT WAS A CLAIM WE
                              CANNOT SUPPORT. `content` is a DISTILLATION of a conversation, not a
                              quotation — so the strongest true statement is that it came out of a
                              conversation on that date. "You said this" asserts he uttered it, and
                              when the distiller writes down its own state instead of his business
                              the assertion is simply false. Ray, 6 August 2026, on an entry reading
                              "Xero connection needed for valuation": *"I didn't say that. Nobody said
                              that... If a machine will put words in my mouth about Xero, I have no
                              reason to believe it won't do it about my margins."*

                              Four separate walkthroughs reported this label before it was believed
                              (28 Jul ×2, 31 Jul, 6 Aug). Each earlier round fixed the third-person
                              VOICE of the content and left the attribution above it untouched,
                              because the sentence reads as provenance rather than as a claim.

                              The weaker sentence costs nothing: the date, which is what a buyer's
                              advisor needs, survives intact. And the STRONG claim already exists
                              directly below and is made only when it is true — `confirmedOn`, "Read
                              back to you and confirmed". That is the split Ray asked for on 31 July
                              ("your example distinguishes 'You confirmed this' from 'Captured — not
                              yet confirmed'"). Do not restore the old wording to make the page sound
                              more certain; the certainty was the defect. */}
                          {/* ⚠️ HIS CLOCK, NOT THE SERVER'S — and `en-AU` does NOT set the clock.
                              `toLocaleDateString('en-AU')` picks the FORMAT and leaves the timezone
                              as the runtime's, which on Vercel is UTC. So a fact captured at 23:11
                              UTC on the 16th — 07:11 on the 17th in Perth — printed here as the 16th
                              and in the handover document, which formats in his own zone, as the
                              17th. Ray downloaded both and found them disagreeing about the day he
                              said something, on a product whose central claim is that every line is
                              dated to the day he said it.
                              The DOCUMENT was right. This was the wrong one, and it is the same trap
                              the manual's own stamp was fixed for once already. Same helper now. */}
                          <p className="text-xs text-stone-400 mt-1">
                            {e.source
                              ? `From your conversation on ${longDateIn(timeZone, e.source.spokenOn)}`
                              : `Captured ${longDateIn(timeZone, e.capturedAt)} — conversation not recorded`}
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
                                timeZone,
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
              <p className="font-display font-bold">
                {g.unsorted.length} {g.unsorted.length === 1 ? 'thing' : 'things'} I have picked up but not filed yet
              </p>
              {/* ⚠️ SECOND PERSON, AND AN EXPLANATION OF THE VOICE BELOW IT.
                  Ray read this block on 2026-08-16 and it is the moment the product frightened him:
                  "I'm reading it referring to me as 'the owner' and 'he'… It stopped feeling like
                  something I own and started feeling like a file somebody's keeping on me." He has
                  told nobody he is selling, and the landing page works hard to disarm exactly that.

                  The entries ARE third person, deliberately and correctly — they are written to be
                  lifted into the handover document a buyer's advisor reads, where "you" would be
                  wrong. The defect was never the voice; it was showing him that voice with no
                  explanation, so it read as surveillance instead of as his own manual being drafted.
                  Saying whose words they are, before he reads them, is the whole fix. */}
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                Have a look and tell me if I have got them right. They are written the way they will
                appear in your handover document — about the business rather than to you — which is
                why they read a little formally.
              </p>
              {/* ⚠️ RANKED BY WHAT A BUYER WOULD STOP ON, NOT BY WHEN SHE HAPPENED TO HEAR IT.
                  Ray: "The nine unsorted facts are shown in the order she happened to hear them.
                  Gary at 61 and a customer at forty per cent should be at the top with a mark
                  against them, not third and second in a list that starts with an apprentice."
                  Uses the SAME rules that decide whether she stops mid-conversation, so the list and
                  her behaviour cannot disagree about which facts matter. */}
              <ul className="mt-3 space-y-2">
                {rankedUnsorted.slice(0, 10).map((e) => (
                  <li key={e.id} className="text-stone-700">
                    {keyRiskFollowUp(e.content) && (
                      <span className="mr-2 rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        a buyer would stop here
                      </span>
                    )}
                    · {e.content}
                    {/* THE SAME MARKER THE FILED ENTRIES CARRY.
                        It was on the sections and not here, and the copy under the download buttons
                        promises the handover document "leaves out anything marked YOURS ONLY above".
                        A tester looked for that marking and found none — because the entries it
                        applies to were sitting in this block, unmarked. The promise pointed at a
                        label the page never printed, which is the same defect as the export filter
                        being attached to one collection instead of to the document. */}
                    {e.privateReason && (
                      <p className="text-xs font-medium text-violet-700 mt-0.5">
                        Yours only — kept out of the handover document, because it touches on{' '}
                        {PRIVATE_REASON_LABEL[e.privateReason]}.
                      </p>
                    )}
                    <RedactEntry id={e.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {g.otherHeld.length > 0 && (
            /* EVERYTHING ELSE SHE IS HOLDING, so "anything here can be taken back" is true.
               These are the notes Kira decided are not part of the business record — chit-chat,
               things about how she should work, facts about another company. They are correctly out
               of the Genome and out of the handover document, and they were also invisible: a tester
               counted 2 on this page against 12 in his own export, and "ten of the twelve aren't on
               the page, so there is no entry and no Remove."
               One of his was "...organizing knowledge and documents to improve business clarity and
               value for a POTENTIAL SALE" — filed as being about the assistant, so out of the Genome,
               so unremovable by him, while reading to a broker exactly like a man preparing to sell.
               Nothing deterministic could reach it. He can. */
            <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
              <p className="font-display font-bold">Other things she has noted ({g.otherHeld.length})</p>
              <p className="text-sm text-stone-600 mt-1 max-w-prose">
                Kept out of your Genome and out of the handover document — these are notes about how
                you want her to work, or things that are not about the business. They are here because
                they are still yours, and anything you would rather she did not keep can go.
              </p>
              <ul className="mt-3 space-y-2">
                {g.otherHeld.slice(0, 30).map((e) => (
                  <li key={e.id} className="text-stone-700 text-sm">
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
              <span className="font-semibold text-violet-700">yours only</span> above.{' '}
              <span className="font-semibold">Your own copy</span> is the same document with those
              left in — it says so at the top, and it is not the one to forward. The{' '}
              <span className="font-semibold">raw data</span> is everything we hold, in a form
              another system can read.
            </p>
            {/* HIS OWN COPY WAS NOT AVAILABLE HERE AT ALL, and that is the gap this closes. Both
                buttons here filtered through the buyer view or handed back raw JSON, so the one
                thing he could not get was a readable version of his OWN record — the one that
                includes what he has marked yours-only. He can now.

                The handover button points at the laid-out document rather than the markdown it used
                to serve. Same job, same filtering, better artefact: his accountant opens it, prints
                it, and puts it in a file. A .md is a developer's format and this reader is not one.
                The markdown route still exists for anyone who wants it. */}
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/api/genome/manual?audience=buyer"
                className="inline-flex items-center min-h-[48px] px-6 rounded-full border border-stone-300 font-display font-semibold"
              >
                Download the handover document
              </a>
              <a
                href="/api/genome/manual?audience=owner"
                className="inline-flex items-center min-h-[48px] px-6 rounded-full border border-stone-300 font-display font-semibold"
              >
                Download your own copy
              </a>
              <a
                href="/api/genome/export?format=json"
                className="inline-flex items-center min-h-[48px] px-6 rounded-full border border-stone-300 font-display font-semibold"
              >
                Download the raw data
              </a>
            </div>

            {/* SAID HERE BECAUSE IT IS NOW TRUE AND NOTHING TELLS HIM. She can write the manual into
                his own Google Drive — one document per section, updated rather than duplicated when
                he asks again. It is reachable only by asking her, so a page that does not mention it
                is a capability nobody discovers.

                Deliberately NOT a button: filing into someone's Drive is approval-gated on purpose,
                and a one-click version would be the guard removed for convenience. Asking her is the
                approval. */}
            <p className="text-stone-600 mt-4 max-w-2xl leading-relaxed">
              You can also ask Kira to put it in your own Google Drive — she files one document per
              section into a folder there, and updates them rather than making new ones each time.
              She will ask which copy you mean first, because the two are not the same file.
            </p>
          </section>
        </>
      )}
    </main>
  );
}
