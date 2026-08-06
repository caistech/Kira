// The mobile drawer must contain its own contents.
//
// THE DEFECT. The drawer panel was a plain block holding a close-button row and then `nav`, which
// carries `h-full`. `h-full` is 100% of the PANEL, so the nav started below the close button and ran
// past the bottom of the white background by exactly that button's height. What fell outside was the
// bottom block — Settings, Sign out, and the account email — rendered on top of the page content
// showing through underneath.
//
// Ray, at 375px, 6 August 2026: *"'Sign out' lands directly across 'Document the core systems' —
// two lines of text in the same place, both unreadable. It's the first thing you see when you open
// the menu on a phone."*
//
// WHY THIS IS A SOURCE ASSERTION. The bug is pure CSS box model — it only exists once a browser has
// laid the panel out, so the honest test is a 375px screenshot, and that needs the live app. What
// CAN be pinned cheaply is the structural precondition that made it possible: a panel that is not a
// flex column, with a nav that assumes it is. This is a smaller claim than "the drawer renders
// correctly" and it is stated as such — see the run notes, where the rendered check is owed.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const src = readFileSync(path.resolve(__dirname, 'PortalShell.tsx'), 'utf8');

/** The drawer panel's own class list — the element with `absolute inset-y-0 left-0`. */
function drawerPanelClasses(): string {
  const m = src.match(/className="absolute inset-y-0 left-0([^"]*)"/);
  return m ? `absolute inset-y-0 left-0${m[1]}` : '';
}

describe('the mobile drawer panel', () => {
  it('exists and is full-height', () => {
    expect(drawerPanelClasses()).toContain('inset-y-0');
  });

  it('is a flex column, so its children cannot overflow it', () => {
    // Without this the close-button row and an `h-full` nav sum to more than the panel.
    const classes = drawerPanelClasses();
    expect(classes).toMatch(/\bflex\b/);
    expect(classes).toMatch(/\bflex-col\b/);
  });

  it('gives the nav a shrinkable, scrollable slot', () => {
    // `min-h-0` is the load-bearing half: a flex child defaults to `min-height: auto` and refuses to
    // shrink below its content, which reproduces the same overflow on a longer item list or a
    // landscape phone. Dropping it would look like a tidy-up and would restore the bug.
    expect(src).toContain('min-h-0 flex-1 overflow-y-auto');
  });

  it('keeps the close row from being squeezed instead', () => {
    // The other way to get this wrong: the nav takes its space out of the header, and the close
    // button — the only way out of the drawer — collapses.
    expect(src).toMatch(/flex shrink-0 justify-end/);
  });
});
