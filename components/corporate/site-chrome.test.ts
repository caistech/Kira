import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { OWN_HEADER, OWN_FOOTER, ownsChrome } from './SiteHeader';
import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS.
//
// The root layout renders CorporateHeader and CorporateFooter on every route that does not opt
// out. A page that grows its own <header> and forgets to opt out therefore ships TWO — and nothing
// errors, nothing logs, the page returns 200, and every existing check passes over it. The
// deploy gate passes (the SHA is right), public-routes passes (no redirect), first-paint passes
// (there is plenty of text). It is only visible to a person looking at the screen.
//
// The old SiteHeader comment predicted exactly this failure and called it "visible immediately."
// It was not. It shipped on SEVEN routes and stood until a tester counted the logos on three of
// them: /sample-genome, /business-valuation, /plan, and then /commit, /privacy, /pubguard, /terms found
// by looking for the class instead of the instance. On /about the two footers disagreed about the
// year.
//
// A rule enforced by remembering holds until someone adds a route at 1am. So the requirement moves
// off the comment and onto the page file: declare your own chrome and this test makes you opt out.
//
// ⚠️ SCOPE, STATED RATHER THAN IMPLIED. This scans page files for a literal `<header`/`<footer`.
// Chrome that arrives through a COMPONENT is invisible to it — /pubguard renders <KiraFooter/>,
// which is why /pubguard is in OWN_FOOTER by measurement and not by this test. The complete
// version of this check counts elements in the SERVED HTML and belongs in @caistech/portfolio-gate
// beside the other live audits; this is the cheap half that runs on every commit.

const APP_DIR = join(__dirname, '..', '..', 'app');

/** `app/business-valuation/page.tsx` -> `/business-valuation`; route groups and files dropped. */
function routeForPageFile(absPath: string): string {
  const rel = relative(APP_DIR, absPath).split(sep).slice(0, -1);
  const segments = rel.filter((s) => !(s.startsWith('(') && s.endsWith(')')));
  return '/' + segments.join('/');
}

function pageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pageFiles(full, acc);
    else if (entry === 'page.tsx' || entry === 'page.ts') acc.push(full);
  }
  return acc;
}

// `stripComments` moved to `lib/source-scan.ts` on its SECOND consumer (the valuation-claims test),
// per the build-alike rule — the reasoning that earned it is documented there.

const PAGES = pageFiles(APP_DIR).map((file) => {
  const src = stripComments(readFileSync(file, 'utf8'));
  return {
    route: routeForPageFile(file),
    file: relative(join(__dirname, '..', '..'), file).split(sep).join('/'),
    // `<header` also matches `<header className=...`; the trailing char guard keeps it from
    // matching a hypothetical `<headerish>`.
    ownHeader: /<header[\s>]/.test(src),
    ownFooter: /<footer[\s>]/.test(src),
  };
});

describe('site chrome — a page that brings its own header or footer must opt out of the shared one', () => {
  it('finds page files at all (a scan that silently matches nothing reads as green forever)', () => {
    expect(PAGES.length).toBeGreaterThan(10);
    expect(PAGES.some((p) => p.route === '/sample-genome')).toBe(true);
  });

  it.each(PAGES.filter((p) => p.ownHeader))(
    '$file declares its own <header>, so $route must be in OWN_HEADER',
    ({ route }) => {
      expect(ownsChrome(OWN_HEADER, route)).toBe(true);
    },
  );

  it.each(PAGES.filter((p) => p.ownFooter))(
    '$file declares its own <footer>, so $route must be in OWN_FOOTER',
    ({ route }) => {
      expect(ownsChrome(OWN_FOOTER, route)).toBe(true);
    },
  );

  // The two lists are deliberately allowed to differ — /sample-genome owns its header and has no footer
  // of its own — but they must stay ROOTED in the same base, or an authenticated route added to
  // one and not the other gets the marketing chrome on half its pages.
  it('every route with its own header also opts out of the marketing footer, unless it has a footer of its own', () => {
    const headerOnly = PAGES.filter((p) => p.ownHeader && !p.ownFooter).map((p) => p.route);
    // These keep CorporateFooter on purpose: it is the only footer they have, and it carries the
    // operator's name. Asserting the intent so that removing it fails here rather than silently.
    for (const route of headerOnly) {
      expect(ownsChrome(OWN_HEADER, route)).toBe(true);
    }
    expect(headerOnly).toContain('/sample-genome');
    expect(ownsChrome(OWN_FOOTER, '/sample-genome')).toBe(false);
  });
});
