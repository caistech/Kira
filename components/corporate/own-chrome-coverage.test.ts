// EVERY ROUTE THAT WRAPS ITSELF IN UserShell MUST OPT OUT OF THE MARKETING CHROME.
//
// `site-chrome.test.ts` already derives membership by looking for chrome in the PAGE files, and it
// is honest about the limit: chrome that arrives through a COMPONENT is invisible to it (that is why
// `/pubguard` is listed "by MEASUREMENT and not by the test"). `/talk` is exactly that case — it has
// no header of its own; it inherits one from `UserShell` via its layout — so nothing caught it, and
// production served the marketing header AND footer on top of the app nav.
//
// Ray, 2026-08-16: "The chat page carries two lots of chrome. Marketing header on top, app
// navigation underneath, and two footers. It looks like two websites glued together."
//
// ⚠️ `/talk` IS NOT `/chat`, AND THAT IS HOW IT WAS MISSED. `/talk` RENDERS the chat page as a
// component rather than redirecting, so the same screen exists at two paths and only one was listed.
// Every Talk control in the product points at `/talk`, so the unlisted one is the version most
// owners actually see.
//
// This asks the question the other test cannot: not "does this page draw a header?" but "does this
// route already have a shell?" — which is answered by the filesystem, not by anyone remembering.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { OWN_HEADER, OWN_FOOTER, ownsChrome } from './SiteHeader';

const appDir = path.resolve(__dirname, '..', '..', 'app');

/** Every layout.tsx under app/ that mounts UserShell, as a route prefix. */
function routesWithUserShell(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) {
      if (entry === 'layout.tsx' && readFileSync(full, 'utf8').includes('UserShell')) {
        found.push(prefix || '/');
      }
      continue;
    }
    // Route groups `(name)` contribute nothing to the URL; dynamic segments `[id]` end the prefix,
    // because the parent is what a list of prefixes can express.
    if (entry.startsWith('(')) {
      found.push(...routesWithUserShell(full, prefix));
    } else if (entry.startsWith('[')) {
      // A dynamic child is covered by its parent prefix — do not descend into a segment we cannot name.
      continue;
    } else {
      found.push(...routesWithUserShell(full, `${prefix}/${entry}`));
    }
  }
  return found;
}

const shellRoutes = routesWithUserShell(appDir).filter((r) => r !== '/');

describe('routes that own their chrome are listed as owning it', () => {
  it('finds the UserShell routes at all', () => {
    // A guard that silently matches nothing is the failure this whole file exists to prevent.
    expect(shellRoutes.length).toBeGreaterThan(5);
    expect(shellRoutes).toContain('/talk');
  });

  for (const route of routesWithUserShell(appDir).filter((r) => r !== '/')) {
    it(`${route} suppresses the marketing header`, () => {
      expect(
        ownsChrome(OWN_HEADER, route),
        `${route} mounts UserShell but is not in OWN_HEADER — it will serve two headers`,
      ).toBe(true);
    });

    it(`${route} suppresses the marketing footer`, () => {
      expect(
        ownsChrome(OWN_FOOTER, route),
        `${route} mounts UserShell but is not in OWN_FOOTER — it will serve two footers`,
      ).toBe(true);
    });
  }
});
