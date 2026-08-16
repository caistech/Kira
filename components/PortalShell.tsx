'use client';

// components/PortalShell.tsx
// Persistent left navbar for authenticated routes (PRODUCT_STANDARDS §4): product surfaces
// first, Settings + Sign Out anchored at the bottom, active-route indicator. Collapses to a
// top bar + slide-in drawer on mobile with the SAME items.

import { useEffect, useState } from 'react';
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
  /**
   * Where the Settings link goes. Defaults to the customer page, which is right for the user portal
   * and was WRONG for the admin console — an operator clicking Settings left the console entirely
   * and had no route back but the address bar.
   */
  settingsHref?: string;
  children: React.ReactNode;
}

export function PortalShell({
  title,
  homeHref,
  items,
  userEmail,
  settingsHref = '/settings',
  children,
}: PortalShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Mirrored onto <html> so global CSS can hide the fixed support launcher while the drawer covers
  // the screen. Cleaned up on close and on unmount — a stuck class would hide the launcher forever.
  useEffect(() => {
    const root = document.documentElement;
    if (drawerOpen) root.classList.add('drawer-open');
    else root.classList.remove('drawer-open');
    return () => root.classList.remove('drawer-open');
  }, [drawerOpen]);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const nav = (
    <nav className="flex h-full flex-col">
      {/* ONE BRAND EITHER SIDE OF THE LOGIN. The marketing site sets "Kira" in the amber→pink→violet
          gradient; this shell used plain grey with teal accents, and a tester crossing from one to
          the other said: "the logo changes from the pink circle on the website to a green square in
          the app. I noticed and wondered if I was on the right site." For a buyer already deciding
          whether to trust the thing, that is a bad question to raise for free. */}
      <Link
        href={homeHref}
        className="block px-4 py-5 text-lg font-bold bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent"
        onClick={() => setDrawerOpen(false)}
      >
        {title}
      </Link>
      <div className="flex-1 space-y-1 px-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setDrawerOpen(false)}
            className={`block rounded-lg px-3 py-2.5 text-base font-medium ${
              isActive(it.href) ? 'bg-violet-50 text-violet-800' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {it.label}
          </Link>
        ))}
      </div>
      <div className="border-t border-gray-100 px-2 py-3">
        {/* CONFIGURABLE, because this shell serves BOTH portals and the destination is not the same
            for each. It was hardcoded to /settings, so an operator clicking Settings in the admin
            console landed on the CUSTOMER settings page — out of the console, with no way back except
            the address bar. Found by a tester walking the admin path. */}
        <Link
          href={settingsHref}
          onClick={() => setDrawerOpen(false)}
          className={`block rounded-lg px-3 py-2.5 text-base font-medium ${
            isActive(settingsHref) ? 'bg-violet-50 text-violet-800' : 'text-gray-700 hover:bg-gray-50'
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
        <Link href={homeHref} className="text-lg font-bold bg-gradient-to-r from-amber-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
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

      {/* ⚠️ MARK THE DOCUMENT WHILE THE DRAWER IS OPEN, so the support launcher can get out of the
          way. `@caistech/sayfix-embed` places a fixed button in a corner and cannot know a drawer has
          opened over it — Ray, 2026-08-17: "when I open the menu it lands right on top of Sign out.
          With my hands I would hit the wrong one, and the wrong one there is a bug report."
          A class on <html> rather than a prop, because the launcher is mounted in the root layout,
          far from this component, and threading state across that distance to hide a third-party
          button would be worse than one line of CSS. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden" data-drawer-open="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          {/* FLEX COLUMN, AND THAT IS THE WHOLE FIX.
              This was a plain block containing the close-button row AND `nav`, which is `h-full`.
              `h-full` resolves to 100% of the PANEL, so the nav began below the close button and ran
              past the bottom of the white background by exactly that button's height — putting
              "Settings", "Sign out" and the account email on top of the page content showing
              through underneath. Ray, at 375px, 6 August 2026: *"'Sign out' lands directly across
              'Document the core systems' — two lines of text in the same place, both unreadable.
              It's the first thing you see when you open the menu on a phone."*

              `min-h-0` on the nav wrapper is load-bearing, not decoration: a flex child's default
              `min-height: auto` refuses to shrink below its content, which reproduces the same
              overflow the moment the nav is taller than the screen — a longer item list, or a
              landscape phone. */}
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex shrink-0 justify-end p-2">
              <button
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
          </div>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
