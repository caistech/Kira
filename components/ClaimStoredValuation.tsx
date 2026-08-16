'use client';

// components/ClaimStoredValuation.tsx
//
// Hands a pre-signup valuation to the account — after asking whether it is his.
//
// WHY IT SITS HERE RATHER THAN IN EACH SIGNUP FLOW. There is more than one way into an account —
// email + password, magic link, paid checkout — and the valuation was only being captured on the
// paid one. Wiring the claim into each flow means remembering it in each flow, and the next flow
// added would forget. Mounting it on the authenticated shell means the claim happens because the
// user is signed in, which is the actual condition.
//
// IT USED TO CLAIM SILENTLY, and the reasoning was sound at the time: the owner already believes his
// valuation followed him in, and a toast saying "we found your valuation" advertises that it might
// not have. What overturned it is that the handoff stopped being per-tab. It now persists on the
// DEVICE for seven days (lib/valuation/persist.ts), deliberately, so a closed tab does not cost him
// the baseline every later movement is measured from.
//
// That makes the silent version wrong, and a naive tester found it by walking exactly the case:
//
//   "The valuation I ran anonymously attached itself to the account I then logged into. My figures
//    — $859,449, 34/100, Architecture & Engineering — became that account's permanent baseline. I
//    never confirmed that. On a shared office machine, whoever runs the valuation and whoever logs
//    in next don't have to be the same person, and the numbers are the most private thing on the
//    screen."
//
// He is right, and his own suggestion is what this now does. His bookkeeper sits eight feet away and
// uses his machine; his foreman uses the office PC. A week-long window on a shared device means the
// next person to sign in inherits someone's turnover, profit and sale plans as their own baseline.
//
// SHOWN, NOT JUST ASKED. The figures are in the prompt so he recognises them instantly, which makes
// this read as continuity rather than as doubt — the thing the silent version was protecting. A
// confirmation that cannot be recognised is just another dialog to dismiss.

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { displayedFigures } from '@/lib/valuation/displayed';
import { computeValuation } from '@/lib/valuation/model';
import { clearStoredValuation, readStoredValuation, type ValuationPayload } from '@/lib/valuation/share';

export function ClaimStoredValuation() {
  const router = useRouter();
  const [payload, setPayload] = useState<ValuationPayload | null>(null);
  const [busy, setBusy] = useState(false);
  // Claimed, but the server tree has not caught up yet — see `decide` below.
  const [claimed, setClaimed] = useState(false);
  const [silent, setSilent] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  // Stand down only once the server tree has arrived carrying the valuation. Until then the card
  // stays put, because the block underneath it still says he has no starting point.
  useEffect(() => {
    if (claimed && !refreshing) setPayload(null);
  }, [claimed, refreshing]);

  useEffect(() => {
    setPayload(readStoredValuation());
  }, []);

  // HE STARTED IT FROM IN HERE — don't ask him whose it is.
  //
  // The question below exists for the anonymous case, where the seven-day device handoff means the
  // next person to sign in on a shared machine could inherit someone else's turnover as their own
  // permanent baseline. A tester asked for that guard and was right to.
  //
  // He then walked the other side of it: he ran the valuation from a button on his own dashboard,
  // signed in, and was asked ninety seconds later whether it was his. "Odd when the app watched me
  // do it." So when the run began inside the app, it is claimed silently — the ownership question
  // has already been answered by the session it started in.
  useEffect(() => {
    if (!payload?.fromApp || busy) return;
    // Claimed without asking, so it must also stand down without announcing itself — otherwise the
    // hold-until-refreshed state below turns a silent claim into a visible one.
    setSilent(true);
    void decide(true);
    // `decide` is stable for this purpose and re-running on its identity would re-fire the claim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.fromApp]);

  if (!payload || silent) return null;

  // Recomputed locally purely to SHOW him something recognisable. The number that gets stored is
  // recomputed server-side from the same inputs and is never taken from here.
  //
  // ⚠️ THROUGH `displayedFigures`, not `formatMoney(result.gap)`. This card is the FIRST screen after
  // he confirms his email, and it was printing the raw gap — $179,503 — about ninety seconds after
  // the result page had told him $180,000. Same figure, two values, on consecutive screens, with the
  // sentence "every change from here is measured against it" underneath. Ray: "I know that the thing
  // telling me what thirty-five years is worth can't tell me the same number twice, and I have to
  // decide whether the $1.04m is any steadier than the $180,000 was."
  //
  // It is the same defect `lib/valuation/displayed.ts` exists to end, in the one place that had not
  // been moved onto it — because this card lives in a component rather than on a page, so the sweep
  // that fixed the pages walked straight past it.
  let headline = '';
  try {
    const result = computeValuation(payload.inputs);
    headline = displayedFigures(
      { worthToday: result.today, worthPotential: result.potential },
      payload.currency,
    ).gapText;
  } catch {
    /* an unreadable payload still gets a prompt — he can discard it */
  }

  async function decide(mine: boolean) {
    if (!payload || busy) return;
    setBusy(true);
    if (!mine) {
      // His answer is the whole point: discard means gone from the device, not "ask again later".
      clearStoredValuation();
      setPayload(null);
      return;
    }
    try {
      const res = await fetch('/api/valuation/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The server refuses to write without this, so a stale client cannot claim silently.
        body: JSON.stringify({ ...payload, confirmed: true }),
      });
      // Cleared only on a definite answer. A network failure keeps it parked so the next
      // authenticated load can ask again — losing it here would reproduce the bug this component
      // was originally written to fix.
      if (res.ok) {
        clearStoredValuation();
        // RE-READ THE SERVER, or the page keeps saying he has no baseline.
        //
        // The surfaces this mounts on are server components that already rendered with NO
        // business_valuations row. Clearing local state hides THIS card and nothing else, so the
        // dashboard carried on showing "Kira doesn't have a starting point for the business yet —
        // answer the eleven questions" to an owner who had just answered them, paid, and handed
        // the result over. He is told to redo the one thing he has already done, at the first
        // screen after checkout.
        //
        // ⚠️ THE REFRESH IS NOT INSTANT, AND HIDING THE CARD FIRST IS WHAT HE ACTUALLY SEES.
        //
        // `router.refresh()` is fire-and-forget: it returns immediately and the new server tree
        // arrives a round-trip later. The old code cleared `payload` in the same tick, so the card
        // vanished at once — and the "no starting point" block it had been sitting on top of was
        // uncovered, unchanged, for as long as the fetch took. On the fresh-signup run that is
        // exactly what happened, and it reads as a failed claim rather than a pending one:
        //
        //   "I had just claimed it. Only when I reloaded the page by hand did the valuation appear.
        //    I would have assumed the claim failed and I would have sat there deciding whether to
        //    answer eleven questions a second time."
        //
        // The claim HAD worked — the row was written before the POST resolved. The defect was
        // purely that the screen told him otherwise while it caught up.
        //
        // Wrapping the refresh in a transition gives it real completion semantics: `refreshing`
        // stays true until the server tree has actually arrived. So the card holds its place with
        // an explicit "saved, updating" state and only stands down once the page behind it is
        // correct — which is also the moment the stale block is gone.
        setClaimed(true);
        startRefresh(() => router.refresh());
      }
    } catch {
      /* keep it; the next mount asks again */
    } finally {
      setBusy(false);
    }
  }

  // HELD, NOT HIDDEN — the claim has landed but the page behind this card has not been redrawn yet,
  // and what is behind it still reads "Kira doesn't have a starting point for the business yet".
  // Saying so plainly is the difference between a pending state and an apparent failure.
  if (claimed) {
    return (
      <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-5" aria-live="polite">
        <h2 className="text-base font-semibold text-stone-900">
          That&apos;s now your starting point{headline ? ` — a gap of ${headline}` : ''}
        </h2>
        <p className="mt-1 max-w-prose text-base text-stone-700">
          Saved. Bringing the rest of the page up to date&hellip;
        </p>
      </div>
    );
  }

  return (
    <div id="claim-valuation" className="mb-6 scroll-mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <h2 className="text-base font-semibold text-stone-900">There&apos;s a business valuation saved on this device</h2>
      <p className="mt-1 max-w-prose text-base text-stone-700">
        {headline
          ? `It puts the gap between what the business is worth today and what it could be worth at ${headline}${
              payload.inputs.industry ? `, in ${payload.inputs.industry}` : ''
            }. `
          : ''}
        If you ran it, we&apos;ll make it your starting point — every change from here is measured
        against it. If someone else used this computer, discard it.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(true)}
          className="min-h-[44px] rounded-full bg-stone-900 px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          That&apos;s mine — use it
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(false)}
          className="min-h-[44px] rounded-full border border-stone-300 bg-white px-5 py-3 text-base font-semibold text-stone-800 disabled:opacity-60"
        >
          Not mine — discard it
        </button>
      </div>
    </div>
  );
}
