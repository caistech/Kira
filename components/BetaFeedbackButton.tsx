'use client';

import { useState } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';

interface BetaFeedbackButtonProps {
  cohort?: string;
  testerId?: string;
  workflow?: string;
}

export function BetaFeedbackButton({ cohort, testerId, workflow }: BetaFeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    rating: 0,
    category: 'bug',
    description: '',
    expected: '',
    actual: '',
    reproducible: false,
    severity: 'P2'
  });
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tester_id: testerId || 'anonymous',
          cohort,
          workflow,
          ...form
        })
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: 'Feedback submitted — thank you!' });
        setForm({ rating: 0, category: 'bug', description: '', expected: '', actual: '', reproducible: false, severity: 'P2' });
      } else {
        setResult({ success: false, message: data.error || 'Failed to submit' });
      }
    } catch {
      setResult({ success: false, message: 'Network error — please try again' });
    } finally {
      setSubmitting(false);
    }
  };

  const open = () => setIsOpen(true);
  const close = () => { setIsOpen(false); setResult(null); };

  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 md:items-end md:justify-end">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Beta Feedback</h3>
            <button onClick={close} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {result && (
              <div className={`p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {result.message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, rating: n }))}
                    className={`w-10 h-10 rounded-lg font-medium transition ${form.rating >= n ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                <option value="usability">Usability</option>
                <option value="bug">Bug</option>
                <option value="missing">Missing Feature</option>
                <option value="praise">Praise</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What happened? *</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                placeholder="Describe the issue or experience..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What you expected</label>
                <input
                  value={form.expected}
                  onChange={e => setForm(f => ({ ...f, expected: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What actually happened</label>
                <input
                  value={form.actual}
                  onChange={e => setForm(f => ({ ...f, actual: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reproducible"
                checked={form.reproducible}
                onChange={e => setForm(f => ({ ...f, reproducible: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <label htmlFor="reproducible" className="text-sm text-gray-700">Can you reproduce this?</label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              >
                <option value="P0">P0 — Critical (blocks workflow)</option>
                <option value="P1">P1 — High (major degradation)</option>
                <option value="P2">P2 — Medium (workaround exists)</option>
                <option value="P3">P3 — Low (cosmetic/minor)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !form.description.trim()}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={open}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-white text-sm font-medium shadow-lg hover:bg-violet-700 transition-all duration-200 hover:shadow-xl"
      aria-label="Send beta feedback"
    >
      <MessageSquare size={18} />
      <span className="hidden sm:inline">Feedback</span>
    </button>
  );
}