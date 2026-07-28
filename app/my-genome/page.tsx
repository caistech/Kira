import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { deriveOwnerGenome } from '@/lib/genome/derive';
import { formatMoney, DEFAULT_CURRENCY } from '@/lib/valuation/currency';

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
  const money = (n: number | null) => (n == null ? '—' : formatMoney(n, DEFAULT_CURRENCY));

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
            {g.totalCaptured} {g.totalCaptured === 1 ? 'thing' : 'things'} captured
            {g.documents > 0 ? `, plus ${g.documents} document${g.documents === 1 ? '' : 's'} you have shared` : ''}.
          </p>

          <div className="mt-6 space-y-3">
            {g.sections.map((s) => (
              <article key={s.key} className="rounded-2xl border border-amber-200 bg-white overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100">
                  <p className="font-display font-bold text-lg">{s.title}</p>
                  <p className="text-sm text-stone-500">{s.question}</p>
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
                          <p className="text-stone-800 leading-relaxed">{e.content}</p>
                          <p className="text-xs text-stone-400 mt-1">
                            Captured{' '}
                            {new Date(e.capturedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>

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
                  <li key={e.id} className="text-stone-700">· {e.content}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="font-display text-xl font-bold">Take it with you</h2>
            <p className="text-stone-600 mt-2 max-w-2xl leading-relaxed">
              It is yours. Download a copy whenever you like — if you stop paying us, you keep it.
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
