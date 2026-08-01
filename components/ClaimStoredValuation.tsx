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

import { useEffect, useState } from 'react';

import { formatMoney } from '@/lib/valuation/currency';
import { computeValuation } from '@/lib/valuation/model';
import { clearStoredValuation, readStoredValuation, type ValuationPayload } from '@/lib/valuation/share';

export function ClaimStoredValuation() {
  const [payload, setPayload] = useState<ValuationPayload | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPayload(readStoredValuation());
  }, []);

  if (!payload) return null;

  // Recomputed locally purely to SHOW him something recognisable. The number that gets stored is
  // recomputed server-side from the same inputs and is never taken from here.
  let headline = '';
  try {
    const result = computeValuation(payload.inputs);
    headline = formatMoney(result.gap, payload.currency);
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
        setPayload(null);
      }
    } catch {
      /* keep it; the next mount asks again */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5">
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
