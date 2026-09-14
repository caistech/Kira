'use client';

// Substance-test & factor editor — the v2 surface the T3 admission gate reserved.
//
// On a WATCHLISTED row: author the substance test and/or clear the factor BEFORE admitting.
// On an ADMITTED row: the factor-bearing item can be upgraded from presence judgment to real
// scoring without changing the live question — or the operator can clear the factor to turn it
// into a document-completing item (the yolkless escape), which is judgeable on presence alone.
//
// This is a client component only for the interactive form; the read-only fields that
// show the CURRENT substance state are rendered by the parent page server component.

import { useState, useTransition } from 'react';
import { setSubstance, type ActionResult, type LedgerRow } from './actions';
import { FACTOR_KEYS } from './actions';

export function SubstanceTestEditor({ row }: { row: LedgerRow }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  const currentFactor = row.factor ?? '';
  const hasSubstance = !!row.substance;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setResult(null);
    startTransition(async () => {
      const outcome = await setSubstance(row.id, {
        factor: String(data.get('factor') || ''),
        tests: String(data.get('tests') || ''),
        weakExample: String(data.get('weakExample') || ''),
        strongExample: String(data.get('strongExample') || ''),
        coaching: String(data.get('coaching') || ''),
      });
      setResult(outcome);
      if (outcome.ok) setOpen(false);
    });
  }

  const field =
    'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100';
  const button =
    'min-h-[44px] rounded-md px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-gray-500 hover:text-violet-600"
      >
        {open ? 'Close substance editor' : hasSubstance ? 'Edit substance test' : 'Write substance test'}
        {!hasSubstance && row.factor ? (
          <span className="ml-2 text-amber-600">
            (factor item without a test — needed before admission)
          </span>
        ) : null}
      </button>

      {!open && (
        <p className="mt-1 text-xs text-gray-400">
          {row.factor
            ? hasSubstance
              ? 'Has a substance test — judged by its criteria.'
              : 'Judged by presence until the substance test is written.'
            : 'Document-completing item (no factor, presence judgment).'}
        </p>
      )}

      {open && (
        <form onSubmit={onSubmit} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-gray-700">Factor</span>
            <select name="factor" defaultValue={currentFactor} className={field}>
              <option value="">None — judged by presence (yolkless)</option>
              {FACTOR_KEYS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-700">Observable tests (one per line, ALL must hold)</span>
            <textarea
              name="tests"
              rows={3}
              defaultValue={row.substance?.tests?.join('\n')}
              placeholder={'answers for the supplier relationships specifically, yes or no\nnames which, where yes'}
              className={field}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-red-600">Weak example</span>
              <textarea
                name="weakExample"
                rows={2}
                defaultValue={row.substance?.weakExample ?? ''}
                placeholder="e.g. 'We have a couple of big ones and a few small ones.'"
                className={field}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-emerald-600">Strong example</span>
              <textarea
                name="strongExample"
                rows={2}
                defaultValue={row.substance?.strongExample ?? ''}
                placeholder="e.g. 'Two accounts over $100k each, the biggest is 35% of revenue.'"
                className={field}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-700">Coaching (what Kira says when the test fails)</span>
            <textarea
              name="coaching"
              rows={2}
              defaultValue={row.substance?.coaching ?? ''}
              placeholder="e.g. 'Name the accounts and rough shares — 'a couple of big ones' doesn't help a buyer model risk.'"
              className={field}
            />
          </label>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <button
              type="submit"
              disabled={pending}
              className={`${button} bg-violet-600 text-white hover:bg-violet-700`}
            >
              {pending ? 'Saving…' : 'Save substance & factor'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${button} border border-gray-200 text-gray-600 hover:bg-gray-50`}
            >
              Cancel
            </button>
          </div>
          {result && (
            <p className={`text-sm ${result.ok ? 'text-violet-700' : 'text-red-600'}`}>
              {result.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}