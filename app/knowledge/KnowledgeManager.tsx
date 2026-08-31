'use client';

// app/knowledge/KnowledgeManager.tsx
// The interactive KB list: see what you've shared, whether Kira can read it, remove it, or add more
// without re-uploading. Reuses the existing ingest routes (/api/kira/knowledge/url + /upload) and the
// new DELETE /api/kira/knowledge/[id]. Responsive (44px targets, 16px base) per PRODUCT_STANDARDS §1.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Link2, StickyNote, Trash2, Loader2, Plus, Upload } from 'lucide-react';

export interface KnowledgeItem {
  id: string;
  title: string;
  sourceType: string;
  url: string | null;
  summary: string | null;
  status: string | null;
  createdAt: string | null;
  chunks: number;
}

function sourceIcon(t: string) {
  if (t === 'user_url' || t === 'kira_research') return <Link2 size={18} className="text-violet-600" />;
  if (t === 'user_note') return <StickyNote size={18} className="text-amber-600" />;
  return <FileText size={18} className="text-indigo-600" />;
}

function readableSource(t: string) {
  switch (t) {
    case 'user_url': return 'Link';
    case 'user_note': return 'Note';
    case 'kira_research': return 'Kira research';
    default: return 'File';
  }
}

export function KnowledgeManager({ personId, initial }: { personId: string; initial: KnowledgeItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function remove(item: KnowledgeItem) {
    if (!confirm(`Remove "${item.title}"? Kira will no longer be able to read it.`)) return;
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/kira/knowledge/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Delete failed');
      router.refresh();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setBusyId(null);
    }
  }

  async function addUrl(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/kira/knowledge/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: value, userId: personId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not add that link');
      setUrl('');
      router.refresh();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setAdding(false);
    }
  }

  async function addFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdding(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', personId);
      const res = await fetch('/api/kira/knowledge/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not upload that file');
      router.refresh();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setAdding(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      {/* Explanatory header (PRODUCT_STANDARDS §5) */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Knowledge</h1>
        <p className="mt-2 max-w-prose text-base text-gray-600">
          The documents and links you&apos;ve shared with Kira. Anything showing &ldquo;Kira can read
          this&rdquo; is searchable in conversation — just ask about it, no need to re-share. Remove
          anything that&apos;s out of date so Kira doesn&apos;t work from a stale copy.
        </p>
      </header>

      {/* Add */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Add to Kira&apos;s knowledge</h2>
        <form onSubmit={addUrl} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a link (a report, a page, a spec…)"
            className="w-full flex-1 rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={adding || !url.trim()}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-base font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Add link
          </button>
        </form>
        <div className="mt-3">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-50">
            <Upload size={18} />
            <span>Upload a file</span>
            <input type="file" onChange={addFile} disabled={adding} className="hidden" />
          </label>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* List */}
      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-base text-gray-600">
            You haven&apos;t shared anything yet. Add a link or upload a file above, and Kira will be
            able to answer from it in conversation.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {initial.map((item) => {
            const readable = item.chunks > 0;
            return (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 shrink-0">{sourceIcon(item.sourceType)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-gray-900">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{readableSource(item.sourceType)}</span>
                      {readable ? (
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">
                          Kira can read this{item.chunks > 1 ? ` · ${item.chunks} sections` : ''}
                        </span>
                      ) : (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Processing / not readable yet</span>
                      )}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-xs text-violet-600 hover:underline"
                      >
                        {item.url}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => remove(item)}
                  disabled={busyId === item.id}
                  aria-label={`Remove ${item.title}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  {busyId === item.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
