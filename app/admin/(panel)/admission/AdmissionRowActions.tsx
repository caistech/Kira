'use client';

// Per-row operator controls on the admission gate: admit, retract-for-cause, flag-retired.
//
// These carry real consequences for the whole cohort — an admission puts the question on every
// business's factor set — so the form feeds a journaled action and the outcome is stated inline
// (the IntroducerActions pattern), never as a bare redirect.

import { useState, useTransition } from 'react';

import {
  admitAdmissionAction,
  retractAdmissionAction,
  flagRetiredAction,
  type ActionResult,
  type LedgerRow,
} from './actions';

export function AdmissionRowActions({ row }: { row: LedgerRow }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function run(action: (data: FormData) => Promise<ActionResult>, form: HTMLFormElement) {
    setResult(null);
    const data = new FormData(form);
    data.set('id', row.id);
    startTransition(async () => {
      const outcome = await action(data);
      setResult(outcome);
      if (outcome.ok) form.reset();
    });
  }

  if (row.retracted_at) return null; // journal entry — nothing to do

  const input =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
  const button =
    'min-h-[44px] rounded-md px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50';

  if (row.status === 'watchlisted') {
    return (
      <div className="mt-4 space-y-3 pt-4">
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row">
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              run(admitAdmissionAction, e.currentTarget);
            }}
          >
            <label className="block">
              <span className="text-xs font-medium text-violet-700">Admission reason (apply the absolute floor)</span>
              <input name="reason" type="text" required autoComplete="off" className={input} />
            </label>
            <button type="submit" disabled={pending} className={`${button} mt-2 bg-violet-600 text-white hover:bg-violet-700`}>
              {pending ? 'Admitting…' : 'Admit to Factor Set'}
            </button>
          </form>

          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              run(retractAdmissionAction, e.currentTarget);
            }}
          >
            <label className="block">
              <span className="text-xs font-medium text-red-700">Retract / discard (journaled)</span>
              <input name="reason" type="text" required autoComplete="off" className={input} />
            </label>
            <button type="submit" disabled={pending} className={`${button} mt-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}>
              Retract
            </button>
          </form>
        </div>
        {result && <p className={`text-sm ${result.ok ? 'text-violet-700' : 'text-red-600'}`}>{result.message}</p>}
      </div>
    );
  }

  // admitted — the journaled controls for a live item.
  return (
    <div className="mt-4 space-y-3 pt-4">
      <div className="flex flex-col gap-3 border-t border-emerald-200/50 pt-3 sm:flex-row">
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            run(retractAdmissionAction, e.currentTarget);
          }}
        >
          <label className="block">
            <span className="text-xs font-medium text-red-700">Retract for cause (never delete)</span>
            <input name="reason" type="text" required autoComplete="off" className={input} />
          </label>
          <button type="submit" disabled={pending} className={`${button} mt-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}>
            Retract
          </button>
        </form>

        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            run(flagRetiredAction, e.currentTarget);
          }}
        >
          <label className="block">
            <span className="text-xs font-medium text-amber-700">Retire for coverage (stays in the denominator)</span>
            <input name="evidence" type="text" required autoComplete="off" className={input} />
          </label>
          <button type="submit" disabled={pending} className={`${button} mt-2 border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}>
            Flag Retired
          </button>
        </form>
      </div>
      {result && <p className={`text-sm ${result.ok ? 'text-emerald-700' : 'text-red-600'}`}>{result.message}</p>}
    </div>
  );
}