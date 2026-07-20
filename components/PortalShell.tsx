'use client';

// components/PortalShell.tsx
// Persistent left navbar for authenticated routes (PRODUCT_STANDARDS §4): product surfaces
// first, Settings + Sign Out anchored at the bottom, active-route indicator. Collapses to a
// top bar + slide-in drawer on mobile with the SAME items.

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { SignOutButton } from '@/components/SignOutButton';

export interface NavItem {
  href: string;
  label: string;
}

interface PortalShellProps {
  title: string;
  homeHref: string;
  items: NavItem[];
  userEmail: string;
  children: React.ReactNode;
}

export function PortalShell({ title, homeHref, items, userEmail, children }: PortalShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const nav = (
    <nav className="flex h-full flex-col">
      <Link href={homeHref} className="px-4 py-5 text-lg font-bold text-gray-900" onClick={() => setDrawerOpen(false)}>
        {title}
      </Link>
      <div className="flex-1 space-y-1 px-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setDrawerOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-base font-medium ${
              isActive(it.href) ? 'bg-teal-50 text-teal-800' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {it.label}
          </Link>
        ))}
      </div>
      <div className="border-t border-gray-100 px-2 py-3">
        <Link
          href="/settings"
          onClick={() => setDrawerOpen(false)}
          className={`block rounded-lg px-3 py-2.5 text-base font-medium ${
            isActive('/settings') ? 'bg-teal-50 text-teal-800' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Settings
        </Link>
        <SignOutButton className="block w-full rounded-lg px-3 py-2.5 text-left text-base font-medium text-gray-700 hover:bg-gray-50" />
        <p className="truncate px-3 pt-2 text-xs text-gray-400">{userEmail}</p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop left rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-gray-200 bg-white md:block">
        {nav}
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <Link href={homeHref} className="text-lg font-bold text-gray-900">
          {title}
        </Link>
        <button
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <div className="flex justify-end p-2">
              <button
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
