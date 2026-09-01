'use client';

import { useState } from 'react';

export function LogAbsenceButton() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [questionsHandled, setQuestionsHandled] = useState('');
  const [ownerNeeded, setOwnerNeeded] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch('/api/absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate,
        endDate,
        questionsHandled: parseInt(questionsHandled) || 0,
        ownerNeeded: ownerNeeded || undefined,
      }),
    });
    if (res.ok) {
      setOpen(false);
      window.location.reload();
    }
    setSubmitting(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
      >
        Log absence
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Log absence</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Start</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">End</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Questions handled by Kira</label>
                <input type="number" value={questionsHandled} onChange={(e) => setQuestionsHandled(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" min="0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">Owner attention needed (optional)</label>
                <textarea value={ownerNeeded} onChange={(e) => setOwnerNeeded(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="What needs the owner's eye when they return?" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancel</button>
                <button type="submit" disabled={submitting} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}