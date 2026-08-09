import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// Register P20. "Kira — your part-time general manager" was the <title> on all five pages he had
// open, so "with three tabs open I can't tell my valuation from the example."
//
// It PASSED the standards check — §7 asks that the title be the product name and not "Create Next
// App", and it was — which is why this needs its own assertion. The standard is about a deployed
// page not shipping scaffold metadata; this is about a man comparing two tabs.
//
// THE CLASS, NOT THE INSTANCE. Fixing the five pages he happened to open is what TESTING_STANDARD
// §2.3 names as the recurring failure here, three times in one day. So the check is: every page
// marked `@public-route` declares its own title, and no two share one.
//
// ⚠️ SCOPED TO `@public-route` DELIBERATELY. That marker already exists and is already maintained
// (portfolio-gate's public-route and first-paint audits read it), so this hangs the requirement on
// something with a reason to stay current rather than inventing a second list nobody updates. An
// authenticated route has the same problem in principle and a far smaller audience, and most of
// them already carry a title.

/**
 * A page's OWN title, from its own file or the layout beside it — client pages cannot export
 * metadata, so `/plan` and `/business-valuation` declare theirs on their layout.
 *
 * ⚠️ THE ROOT LAYOUT IS NOT A PAGE'S OWN TITLE. `app/page.tsx` sits next to `app/layout.tsx`, so a
 * naive "look in the layout beside it" reads the ROOT metadata — the very title this whole check
 * exists because every page was inheriting. It reported the landing as titled "Kira — your part-time
 * general manager" and then failed it for starting with "Kira", which is true and is not the
 * landing's fault: the product name is the correct title for the front door.
 */
function titleFor(pagePath: string): string | null {
  const dir = dirname(pagePath).replace(/\\/g, '/');
  const candidates = dir === 'app' ? [pagePath] : [pagePath, join(dir, 'layout.tsx')];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const src = stripComments(readFileSync(file, 'utf8'));
    // Only a metadata title, never a `title:` field on some unrelated object — the valuation page's
    // own step type has one, and matching it would have reported that page as titled when it was not.
    //
    // ⚠️ WINDOWED RATHER THAN BRACE-MATCHED. The first version anchored on `\n};`, which reads a
    // multi-line declaration and silently misses `export const metadata = { title: '…' };` on one
    // line — the form /login and /signup use. It reported both as untitled when both were fine,
    // which is the failure mode that gets a check deleted rather than fixed.
    const at = src.indexOf('export const metadata');
    if (at === -1) continue;
    const title = src.slice(at, at + 600).match(/title:\s*(['"`])([\s\S]*?)\1/);
    if (title) return title[2]!;
  }
  return null;
}

/**
 * Every `page.tsx` under app/.
 *
 * Walked by hand rather than with `fs.globSync`: vitest resolves that at runtime on this Node, and
 * `tsc` does not have it in its `node:fs` types — so the suite went green while the typecheck went
 * red, which is the worst of both and exactly the kind of split that gets a check disabled.
 */
function pagesUnder(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) pagesUnder(full, found);
    else if (entry.name === 'page.tsx') found.push(full);
  }
  return found;
}

const PUBLIC_PAGES = pagesUnder('app').filter((p) => readFileSync(p, 'utf8').includes('@public-route'));

describe('every public page has its own title', () => {
  it('finds the public pages at all (a scan matching nothing is green forever)', () => {
    expect(PUBLIC_PAGES.length).toBeGreaterThanOrEqual(10);
  });

  for (const page of PUBLIC_PAGES) {
    const normalised = page.replace(/\\/g, '/');
    it(`${normalised} declares a title`, () => {
      // `app/page.tsx` is the landing and inherits the root title by design — the product name IS
      // the right title for the front door, and it is the one page nobody confuses with another.
      if (normalised === 'app/page.tsx') return;
      expect(titleFor(page)).not.toBeNull();
    });
  }

  it('gives no two public pages the same title', () => {
    const titles = PUBLIC_PAGES.map((p) => titleFor(p)).filter((t): t is string => t !== null);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('leads with the distinguishing word, not with "Kira"', () => {
    // A tab strip shows about twenty characters. Five tabs all reading "Kira — …" is the defect
    // with extra steps, so the convention the already-titled pages use (/login, /settings,
    // /advisors) is enforced: the distinguishing word first, " · Kira" trailing.
    for (const page of PUBLIC_PAGES) {
      const title = titleFor(page);
      if (!title) continue;
      expect(title.toLowerCase().startsWith('kira ')).toBe(false);
    }
  });
});
