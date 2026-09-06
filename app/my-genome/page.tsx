// app/my-genome/page.tsx
import { getAuthUser, getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { KiraShapeSection } from '@/components/KiraShapeSection';
import { buildGenomeOverviewFirstMessage } from '@/lib/kira/area-focus';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { ShareGenome } from '@/components/ShareGenome';
import { GenomeBuckets } from '@/components/GenomeBuckets';
import { getBusinessIdentity } from '@/lib/business-identity/store';
import { longDateIn, timeZoneForState } from '@/lib/business-identity';
import { formatMoneyApprox, DEFAULT_CURRENCY } from '@/lib/valuation/currency';
import { displayedFigures } from '@/lib/valuation/displayed';
import { RedactEntry } from '@/components/RedactEntry';
import { PRIVATE_REASON_LABEL } from '@/lib/genome/private';
import { WHO_CAN_SEE_IT } from '@/lib/privacy';
import { readGenomeViews } from '@/lib/genome/access-log';
import { keyRiskFollowUp } from '@/lib/kira/key-risk';
import { buyerEntryCount } from '@/lib/genome/buyer-view';

export const dynamic = 'force-dynamic';

const FILING_WINDOW_MS = 25 * 60 * 1000;

function isStillFiling(startedAt: string | null | undefined): boolean {
  if (!startedAt) return false;
  return Date.now() - new Date(startedAt).getTime() < FILING_WINDOW_MS;
}

export default async function MyGenome() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="font-display text-2xl font-bold">Your Operating Manual</h1>
        <p className="text-stone-600 mt-3">Sign in to see what Kira has captured about your business.</p>
        <a href="/login" className="mt-6 inline-flex items-center min-h-[44px] text-violet-600 underline underline-offset-4">Sign in</a>
      </main>
    );
  }

  const orgContext = await getCurrentOrganisationContext();
  if (!orgContext) {
    return (
      <main className="max-w-3xl mx-auto px-5 py-16">
        <h1 className="font-display text-2xl font-bold">Your Operating Manual</h1>
        <p className="text-stone-600 mt-3">No organisation membership found.</p>
      </main>
    );
  }

  const svc = createServiceClientV2();
  
  // Resolve person context for view-logging - getCurrentOrganisationContext() gives us personId
  const personId = orgContext.personId;

  const g = await deriveOwnerGenome(orgContext);

  const { data: lastConversation } = await svc
    .from('conversations')
    .select('started_at')
    .eq('organisation_id', orgContext.organisationId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const justTalked = isStillFiling(lastConversation?.started_at as string | null);
  const identity = await getBusinessIdentity(orgContext.organisationId);
  const timeZone = timeZoneForState(identity?.state);
  
  const views = await readGenomeViews(personId);

  const rankedUnsorted = [...g.unsorted].sort(
    (a, b) => Number(Boolean(keyRiskFollowUp(b.content))) - Number(Boolean(keyRiskFollowUp(a.content))),
  );

  const sections = [...g.sections].sort(
    (a, b) => Number(b.entries.length > 0) - Number(a.entries.length > 0),
  );
  
  const populated = g.sections.filter((s) => s.entries.length > 0).length;
  
  const figures = displayedFigures(
    { worthToday: g.worthToday ?? 0, worthPotential: (g.worthToday ?? 0) + (g.gap ?? 0) },
    DEFAULT_CURRENCY,
  );

  return (
    <main className="max-w-3xl mx-auto px-5 py-10 pb-20">
      <h1 className="font-display text-3xl font-bold">Your Operating Manual</h1>
      
      {g.unsorted.length > 0 && (
        <p className="mt-4 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base text-stone-800">
          {g.unsorted.length} {g.unsorted.length === 1 ? 'fact is' : 'facts are'} still being sorted
          into the nine areas. They are in the document either way — under &ldquo;other things the
          owner has told us&rdquo; rather than in their section. If you are sending it to someone,
          it is worth waiting a few minutes and taking a fresh copy.
        </p>
      )}

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
          ownerName={orgContext.personId} // Best available identifier in current context
          hasDocument={!g.empty}
          buyerEntries={buyerEntryCount({ sections: g.sections, unsorted: g.unsorted })}
        />
      </div>
      
      <p className="text-lg text-stone-600 mt-4 leading-relaxed max-w-2xl">
        Everything Kira has captured about how your business actually runs, organised by the questions
        a buyer&apos;s advisor will ask you. It grows every time you talk to her — there is nothing to
        fill in.
      </p>

      <KiraShapeSection
        surface="my-genome"
        firstMessage={
          buildGenomeOverviewFirstMessage(g.sections, undefined) ?? undefined
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
            {g.totalCaptured} {g.totalCaptured === 1 ? 'thing' : 'things'} captured
            {populated > 0
              ? `, across ${populated} of the ${g.sections.length} areas below`
              : g.unsorted.length > 0
                ? ', none of them filed into an area yet — Kira does that once she is sure where each belongs'
                : ''}
            {g.documents > 0 ? `, plus ${g.documents} document${g.documents === 1 ? '' : 's'} you have shared` : ''}.
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

          <p className="mt-3 text-base text-stone-600">
            This page is yours. It is never shared with anyone you have referred or been referred by,
            and it is never shown to a buyer — only the handover document is, and that leaves out your
            own position. {WHO_CAN_SEE_IT} Anything here can be taken back — use{' '}
            <span className="font-semibold">Remove</span> on the entry itself.
          </p>

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
                    s.baseline ? (
                      <div className="space-y-2">
                        <p className="text-stone-700 leading-relaxed">{s.baseline.statement}</p>
                        <p className="text-xs text-stone-400">
                          From the answers you gave before signing up — not something Kira has captured yet.
                          {s.baseline.location === 'head'
                            ? ' Talk to her and this becomes part of your Operating Manual.'
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
                          {e.headline ? (
                            <p className="font-display font-semibold text-stone-900">{e.headline}</p>
                          ) : null}
                          <p className={`text-stone-800 leading-relaxed${e.headline ? ' text-sm text-stone-600' : ''}`}>
                            {e.content}
                          </p>
                          <p className="text-xs text-stone-400 mt-1">
                            {e.source
                              ? `From your conversation on ${longDateIn(timeZone, e.source.spokenOn)}`
                              : `Captured ${longDateIn(timeZone, e.capturedAt)} — conversation not recorded`}
                          </p>
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
                          {e.privateReason && (
                            <p className="text-xs font-medium text-violet-700 mt-0.5">
                              Yours only — kept out of the handover document, because it touches on{' '}
                              {PRIVATE_REASON_LABEL[e.privateReason]}.
                            </p>
                          )}
                          {e.alsoRecordedOn && e.alsoRecordedOn.length > 0 && (
                            <p className="text-xs text-stone-500 mt-0.5">
                              Also picked up{' '}
                              {e.alsoRecordedOn.map((d) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })).join(', ')}
                            </p>
                          )}
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
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <p className="font-display font-bold">
                {g.unsorted.length} {g.unsorted.length === 1 ? 'thing' : 'things'} I have picked up but not filed yet
              </p>
              <p className="text-sm text-stone-600 mt-1 leading-relaxed">
                Have a look and tell me if I have got them right. They are written the way they will
                appear in your handover document — about the business rather than to you — which is
                why they read a little formally.
              </p>
              <ul className="mt-3 space-y-2">
                 {rankedUnsorted.slice(0, 10).map((e) => (
                  <li key={e.id} className="text-stone-700">
                    {keyRiskFollowUp(e.content) && (
                      <span className="mr-2 rounded-full border border-amber-400 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        a buyer would stop here
                      </span>
                    )}
                    · {e.content}
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
            <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
              <p className="font-display font-bold">Other things she has noted ({g.otherHeld.length})</p>
              <p className="text-sm text-stone-600 mt-1 max-w-prose">
                Kept out of your Operating Manual and out of the handover document — these are notes about how
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
            <h2 className="font-display text-xl font-bold">Get it ready for your broker</h2>
            <p className="text-stone-600 mt-2 max-w-2xl leading-relaxed">
              You can download the handover document whenever you like. Kira has already stripped out
              everything marked private — your plans, your exit timing, and anything you asked her to
              keep only for you. It is safe to send to an advisor or a prospective buyer.
            </p>
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
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/api/genome/manual?audience=buyer"
                className="inline-flex items-center min-h-[48px] px-6 rounded-full border border-stone-300 font-display font-semibold"
              >
                Download: Broker-Safe Version
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
