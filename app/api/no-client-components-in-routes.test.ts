import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// NO API ROUTE IMPORTS A `'use client'` COMPONENT.
//
// ⚠️ THIS DOES NOT FAIL LOUDLY, WHICH IS THE ENTIRE REASON FOR THE CHECK. A server route that
// imports a client component pulls React and the whole component graph into its module graph. It
// typechecks, it builds, it works — and it gets slow.
//
// Measured, 2026-08-16: adding one import of `components/KiraBranding.tsx` to
// `app/api/beta/redeem/route.ts` — for a single string constant — took the billing integration
// suite from **19 seconds to a 45-second timeout with all seven tests skipped**. That reads exactly
// like the live-network Stripe flake CLAUDE.md documents ("passes on re-run"), so the honest
// diagnosis was one `git stash` away and would otherwise have been recorded as a known flake and
// left. It was found only because the clean tree passed in 19s and the dirty one did not.
//
// The fix is always the same and always cheap: put the shared value in a plain `.ts` module and let
// the component import THAT.

function routeFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...routeFiles(path));
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') out.push(path);
  }
  return out;
}

/** Local imports that resolve to a .tsx file — the only ones that can be client components. */
function localTsxImports(src: string): string[] {
  const out: string[] = [];
  const re = /from\s+['"](@\/[^'"]+|\.[^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const spec = m[1];
    if (spec.startsWith('@/')) {
      const candidate = spec.slice(2);
      for (const ext of ['.tsx', '/index.tsx']) {
        try {
          readFileSync(join(process.cwd(), candidate + ext), 'utf8');
          out.push(candidate + ext);
        } catch {
          /* not a .tsx — fine */
        }
      }
    }
  }
  return out;
}

describe('API routes do not import client components', () => {
  const routes = routeFiles(join(process.cwd(), 'app', 'api')).map((p) =>
    p.slice(process.cwd().length + 1).replace(/\\/g, '/'),
  );

  it('found the routes to check', () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  it.each(routes)('%s', (route) => {
    const offences = localTsxImports(readFileSync(route, 'utf8')).filter((target) =>
      /^\s*['"]use client['"]/m.test(readFileSync(join(process.cwd(), target), 'utf8')),
    );
    expect(offences, `imports client component(s): ${offences.join(', ')}`).toEqual([]);
  });
});
