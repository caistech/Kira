'use client';

// components/OrgSwitcher.tsx
// "Which organisation am I working in?" control for the authenticated portal shell.
//
// Renders ONLY when the person belongs to more than one organisation — a single-org
// member (the common case) sees the plain business title, no extra chrome.
//
// Selecting another org calls switchOrganisation (lib/org-switch.ts), which is the
// server-authoritative path: it re-verifies the caller's ACTIVE membership server-side
// before persisting selected_org_id. A member is never able to switch into an org they
// do not belong to.

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { switchOrganisation } from '@/lib/org-switch';
import type { UserOrganisationOption } from '@/lib/auth';

interface OrgSwitcherProps {
  options: UserOrganisationOption[];
  /** Fallback when no options match the current title (e.g. resolution hiccup). */
  currentTitle: string;
}

export function OrgSwitcher({ options, currentTitle }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Only surface the switcher when switching is actually possible.
  if (!options || options.length < 2) return <span className="block px-4 py-5 text-lg font-bold">{currentTitle}</span>;

  const current =
    options.find((o) => o.isCurrent) ??
    options.find((o) => o.name === currentTitle) ??
    null;

  const onSelect = (organisationId: string, name: string) => {
    if (organisationId === current?.organisationId) {
      setOpen(false);
      return;
    }
    setError(null);
    setPending(organisationId);
    startTransition(async () => {
      const res = await switchOrganisation(organisationId);
      setPending(null);
      if (!res?.ok) {
        setError(res?.error || 'Could not switch organisation.');
        return;
      }
      setOpen(false);
      // Full-page refresh so the new org's context applies to every surface + chrome.
      // (server action revalidated; a hard reload guarantees consistency across nested
      // layouts and server components.)
      window.location.reload();
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch organisation"
        className="flex w-full items-center justify-between gap-1 px-4 py-5 text-left text-lg font-bold"
      >
        <span className="bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
          {current?.name ?? currentTitle}
        </span>
        <ChevronsUpDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            aria-label="Select organisation"
            className="absolute left-2 right-2 bottom-full z-50 mb-1 max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Switch business
            </div>
            {options.map((o) => {
              const active = o.organisationId === current?.organisationId;
              return (
                <button
                  key={o.organisationId}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={isPending || pending === o.organisationId}
                  onClick={() => onSelect(o.organisationId, o.name)}
                  className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-base ${
                    active ? 'bg-violet-50 text-violet-800' : 'text-gray-800 hover:bg-gray-50'
                  } disabled:cursor-wait disabled:opacity-60`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{o.name}</span>
                    <span className="block text-xs capitalize text-gray-400">{o.role}</span>
                  </span>
                  {pending === o.organisationId ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
                  ) : active ? (
                    <Check className="h-4 w-4 shrink-0 text-violet-600" />
                  ) : null}
                </button>
              );
            })}
            {error && <div className="px-4 pt-1 pb-3 text-sm text-red-600">{error}</div>}
          </div>
        </>
      )}
    </div>
  );
}
