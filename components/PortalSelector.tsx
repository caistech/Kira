'use client';

// components/PortalSelector.tsx
//
// "Which Kira hat am I wearing?" control for the authenticated portal chrome.
//
// Shows ONLY when the person is authorised for more than one portal. It is a
// navigation convenience: selecting a portal remembers the choice in
// sessionStorage and navigates to that portal's home route. It NEVER grants
// authority — every portal route verifies the caller's own access server-side,
// exactly as it always has.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, LayoutGrid } from 'lucide-react';
import type { PortalId, PortalOption } from '@/lib/portal';

const STORAGE_KEY = 'kira.selectedPortal';

export function PortalSelector({
  portals,
  currentId,
}: {
  portals: PortalOption[];
  currentId: PortalId;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Hidden entirely for single-portal people — the selector only answers a
  // question they never had.
  if (portals.length < 2) {
    return null;
  }

  const current =
    portals.find((portal) => portal.id === currentId) ?? portals[0];

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function select(portal: PortalOption) {
    setOpen(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, portal.id);
    } catch {
      // Storage unavailable — navigation still works, the choice just forgets.
    }
    router.push(portal.href);
  }

  return (
    <div ref={ref} className="relative border-b border-gray-100 px-3 pb-3 pt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left hover:bg-gray-50"
      >
        <LayoutGrid className="h-4 w-4 shrink-0 text-violet-600" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Portal
          </span>
          <span className="block truncate text-sm font-semibold text-gray-900">
            {current.label}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Switch portal"
          className="absolute left-3 right-3 top-full z-30 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {portals.map((portal) => {
            const active = portal.id === currentId;
            return (
              <button
                key={portal.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(portal)}
                className={`block w-full px-3 py-2.5 text-left hover:bg-violet-50 ${
                  active ? 'bg-violet-50' : ''
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">
                      {portal.label}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {portal.description}
                    </span>
                  </span>
                  {active && (
                    <Check className="h-4 w-4 shrink-0 text-violet-600" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}