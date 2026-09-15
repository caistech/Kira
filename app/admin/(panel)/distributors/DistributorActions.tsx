'use client';

// Per-portfolio-entry operator controls: suspend/restore, or archive.
//
// Consequence clarity (PRODUCT_STANDARDS §9): suspending cuts the distributor's access to that
// client organisation immediately, and the operator should know that's what the button does rather
// than discover it from a confused partner. Archiving removes them from the portfolio entirely.

import { useState, useTransition } from 'react';

import { setPortfolioStatus, archivePortfolioEntry, type ActionResult } from './actions';

export function DistributorActions({
  entryId,
  suspended,
  archived,
}: {
  entryId: string;
  suspended: boolean;
  archived: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function run(action: (data: FormData) => Promise<ActionResult>, data: FormData) {
    setResult(null);
    startTransition(async () => setResult(await action(data)));
  }

  function onToggleStatus() {
    if (!suspended && !confirm('Suspend access to this client organisation? It stops immediately.')) {
      return;
    }
    const data = new FormData();
    data.set('entry_id', entryId);
    data.set('suspend', String(!suspended));
    run(setPortfolioStatus, data);
  }

  function onArchive() {
    if (!confirm('Remove this client organisation from the portfolio? This is retroactive — their access ends now.')) {
      return;
    }
    const data = new FormData();
    data.set('entry_id', entryId);
    run(archivePortfolioEntry, data);
  }

  const button =
    'min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!archived && (
        <button
          type="button"
          onClick={onToggleStatus}
          disabled={pending}
          className={`${button} ${suspended ? 'border-violet-300 text-violet-700 hover:bg-violet-50' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
        >
          {pending ? '…' : suspended ? 'Restore' : 'Suspend'}
        </button>
      )}
      {!archived && (
        <button
          type="button"
          onClick={onArchive}
          disabled={pending}
          className={`${button} border-gray-300 text-gray-600 hover:bg-gray-50`}
        >
          {pending ? '…' : 'Archive'}
        </button>
      )}
      {result && <span className={`text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.message}</span>}
    </div>
  );
}