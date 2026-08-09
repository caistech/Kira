import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS — K5/P3.
//
// Five page files loaded their webfonts with an @import of a Google Fonts stylesheet, inside a
// <style> element in the BODY. That is the worst available shape for a webfont: a render-blocking
// stylesheet the preload scanner cannot see, discovered only after the surrounding HTML is parsed,
// on a third-party origin with no preconnect, which then triggers a second request for the font
// files themselves. They were on /genome, /business-valuation, /plan, /onboarding and the classic
// landing — every one of them a page a tester called slow.
//
// Nothing catches this. It is not an error, a redirect or a blank page; the page renders correctly
// and simply renders LATER, and it is trivially easy to reintroduce by copying an existing page as
// the template for a new one, which is how it reached five files in the first place.
//
// ⚠️ Comments are stripped, because the replacement comment in each of those files explains the
// removal by naming what was removed.

const APP_DIR = __dirname;
const REPO = join(__dirname, '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

const FILES = [...sourceFiles(APP_DIR), ...sourceFiles(join(REPO, 'components'))]
  .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
  .map((file) => ({
    file: relative(REPO, file).split(sep).join('/'),
    src: stripComments(readFileSync(file, 'utf8')),
  }));

describe('no page loads a font by blocking on a third party', () => {
  it('finds source files at all (a scan matching nothing reads as green forever)', () => {
    expect(FILES.length).toBeGreaterThan(30);
    expect(FILES.some((f) => f.file === 'app/genome/page.tsx')).toBe(true);
  });

  it('no file imports a stylesheet from fonts.googleapis.com', () => {
    // next/font self-hosts the faces at build time (app/layout.tsx), so there is no third-party
    // request to make faster — there is none at all.
    const offenders = FILES.filter((f) => f.src.includes('fonts.googleapis.com')).map((f) => f.file);
    expect(offenders).toEqual([]);
  });

  it('no file declares an @import inside a <style> element', () => {
    // The general form. A self-hosted @import would be nearly as bad: an @import is always
    // discovered late, because the parser has to fetch and read the containing sheet first.
    const offenders = FILES.filter((f) => /<style[^>]*>[\s\S]*?@import/.test(f.src)).map((f) => f.file);
    expect(offenders).toEqual([]);
  });
});

describe('/genome does not depend on hydration to be usable', () => {
  const genome = FILES.find((f) => f.file === 'app/genome/page.tsx')!;

  it('is a server component', () => {
    // "8 of the 9 areas are not clickable." The handlers were real; a click before hydration was
    // silently dropped. Making the page a server component with native <details> removes the
    // window entirely rather than shortening it — which matters because the window's length is a
    // property of the visitor's device, and we cannot measure his.
    expect(genome.src).not.toContain("'use client'");
    expect(genome.src).not.toMatch(/\buseState\b/);
  });

  it('opens its areas with <details>, not an onClick', () => {
    expect(genome.src).toContain('<details');
    expect(genome.src).toContain('<summary');
    expect(genome.src).not.toMatch(/onClick/);
  });
});
