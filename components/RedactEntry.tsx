'use client';

// components/RedactEntry.tsx
//
// The per-entry "take that back" control on the owner's Genome.
//
// Small on purpose. The Genome is a document he reads, not a workspace he edits, and a row of loud
// controls beside every fact would turn the page that is meant to feel like a manual into an admin
// screen. This sits quiet until he wants it.
//
// IT CONFIRMS FIRST. Removing a fact is not destructive in the database — the row is parked, not
// deleted — but it IS destructive from where he sits: the thing disappears from his Genome, his
// recall and his export. He is 66, often on a phone, and the standing rule is that anything with a
// consequence names it before the click rather than after.
//
// The optimistic hide is deliberate. He clicked because he wants it gone NOW — the sentence about
// selling his business is on screen in an office with other people in it — and waiting on a round
// trip to make it disappear is the wrong trade. A failure puts it back and says so.

import { useState } from 'react';

export function RedactEntry({ id }: { id: string }) {
  const [state, setState] = useState<'idle' | 'confirming' | 'working' | 'gone' | 'failed'>('idle');

  async function remove() {
    setState('working');
    try {
      const res = await fetch('/api/genome/redact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setState(res.ok ? 'gone' : 'failed');
    } catch {
      setState('failed');
    }
  }

  if (state === 'gone') {
    return (
      <p className="mt-1 text-sm text-stone-500">
        Removed. It is out of your Genome and your export, and Kira will not bring it up again.
      </p>
    );
  }

  if (state === 'failed') {
    // Never silent. He believes it is gone; if it is not, he has to hear that from us and not find
    // out later by seeing it in a document he has handed to a buyer.
    return (
      <p className="mt-1 text-sm text-red-700">
        That did not save — it is still in your Genome.{' '}
        <button type="button" onClick={remove} className="min-h-[44px] underline underline-offset-4">
          Try again
        </button>
      </p>
    );
  }

  if (state === 'confirming') {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <span className="text-sm text-stone-600">
          Remove this from your Genome, your recall and your export?
        </span>
        <button
          type="button"
          onClick={remove}
          className="min-h-[44px] rounded-full bg-stone-900 px-4 text-sm font-semibold text-white"
        >
          Yes, remove it
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="min-h-[44px] px-2 text-sm font-medium text-stone-500 underline underline-offset-4"
        >
          Keep it
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={state === 'working'}
      onClick={() => setState('confirming')}
      className="mt-1 min-h-[44px] text-sm font-medium text-stone-400 underline underline-offset-4 hover:text-stone-700 disabled:opacity-60"
    >
      Remove
    </button>
  );
}
