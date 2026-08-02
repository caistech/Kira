#!/usr/bin/env node
//
// Does every AUTHENTICATED route render inside the app chrome? (PRODUCT_STANDARDS §4)
//
// WHY THIS EXISTS, and it is not a hypothetical. The same defect shipped TWICE IN SIX DAYS at two
// different URLs:
//
//   2026-07-27  /chat/[agentId] had no layout. Sign-in landed there, so the first authenticated
//               screen an owner ever saw had no nav, no Settings and no Sign Out, and the only route
//               to his own account was to type /settings into the address bar. Fixed by adding a
//               layout to that route.
//   2026-08-02  /talk was added, rendering ChatPage AS A COMPONENT rather than redirecting — which
//               skips the layout of the route it borrowed from. Sign-in moved to /talk. The chrome
//               fix stayed attached to /chat. A tester signed in, found a text box and a "More" menu,
//               and located the product by guessing /dashboard.
//
// Both times the rule was known, written down, and followed everywhere else. What failed was that
// §4 is enforced by REMEMBERING to put a route under a layout — and a rule enforced by remembering
// holds until someone adds a route at 1am. This is the mechanism instead.
//
// HOW IT DECIDES. A route is authenticated if it, or any layout above it, resolves the signed-in
// user or bounces to a login. It is chromed if any layout in the same chain mounts one of the two
// real shells. Both are read from the layout CHAIN rather than the page, which is exactly why /talk
// is caught no matter what it chooses to render.
//
// OPTING OUT. Some authenticated routes genuinely should not carry the app chrome — a setup wizard
// mid-flow, for instance, where the nav would invite the user to leave before the thing they came
// to do is finished. Mark the page:
//
//     // @no-app-chrome: setup wizard — nav would invite an exit mid-flow
//
// A bare marker is rejected. The reason is the point: it makes the decision visible in the diff, in
// the file the person is already editing, instead of in a list somewhere they will never open.
//
//   node scripts/check-app-chrome.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const APP = 'app';

/** The two real shells. Either satisfies §4; anything else is a hand-rolled chrome and does not. */
const SHELLS = ['UserShell', 'PortalShell'];

/** How a file says "you must be signed in to see this". */
const AUTH_SIGNALS = [/getCurrentAppUser\s*\(/, /getAuthUser\s*\(/, /isCurrentUserAdmin\s*\(/, /redirect\(\s*['"`]\/login/, /redirect\(\s*['"`]\/admin\/login/];

const OPT_OUT = /@no-app-chrome:\s*(\S.*)/;

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

/** Every page.tsx under app/, as directory paths. */
function pageDirs(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pageDirs(full, out);
    else if (entry === 'page.tsx' || entry === 'page.ts') out.push(dir);
  }
  return out;
}

/**
 * The layout files that wrap this page, innermost first.
 *
 * Route groups — the `(panel)` in app/admin/(panel)/ — are ordinary directories on disk and DO carry
 * layouts, so walking the filesystem upward is the correct model of what Next actually composes.
 */
function layoutChain(pageDir) {
  const chain = [];
  let dir = pageDir;
  for (;;) {
    for (const name of ['layout.tsx', 'layout.ts']) {
      const candidate = join(dir, name);
      try {
        statSync(candidate);
        chain.push(candidate);
      } catch {
        /* no layout at this level — normal */
      }
    }
    if (dir === APP) break;
    const parent = dir.split(sep).slice(0, -1).join(sep);
    if (!parent || parent === dir) break;
    dir = parent;
  }
  return chain;
}

let failures = 0;
let checked = 0;
let exempt = 0;

for (const dir of pageDirs(APP).sort()) {
  const pageFile = [join(dir, 'page.tsx'), join(dir, 'page.ts')].find((f) => {
    try {
      statSync(f);
      return true;
    } catch {
      return false;
    }
  });
  const chain = layoutChain(dir);
  const sources = [read(pageFile), ...chain.map(read)];

  const authenticated = sources.some((s) => AUTH_SIGNALS.some((r) => r.test(s)));
  if (!authenticated) continue;
  checked += 1;

  const route = `/${relative(APP, dir).split(sep).filter((s) => !s.startsWith('(')).join('/')}` || '/';

  const optOut = read(pageFile).match(OPT_OUT);
  if (optOut) {
    exempt += 1;
    console.log(`  – ${route} — exempt: ${optOut[1].trim()}`);
    continue;
  }

  const chromed = chain.some((f) => SHELLS.some((shell) => read(f).includes(shell)));
  if (chromed) {
    console.log(`  ✓ ${route}`);
    continue;
  }

  failures += 1;
  console.log(
    `  ✗ ${route} — authenticated, but no layout in its chain mounts ${SHELLS.join(' or ')}.\n` +
      `      An owner landing here has no nav, no Settings and no Sign Out.\n` +
      `      Add a layout.tsx wrapping children in UserShell, or mark the page\n` +
      `      // @no-app-chrome: <why this route must not carry the chrome>`,
  );
}

console.log(
  `\n[app-chrome] ${checked} authenticated route(s): ${checked - failures - exempt} chromed, ${exempt} exempt, ${failures} FAILING`,
);

if (!checked) {
  // Nothing found is not a pass. It means the auth signals no longer match how this codebase spells
  // "signed in", and a check that silently inspects nothing is indistinguishable from one that
  // passed — the failure mode the portfolio's gate scripts exist to refuse.
  console.log('[app-chrome] FAIL — no authenticated routes detected at all; the AUTH_SIGNALS list is stale.');
  process.exit(1);
}

process.exit(failures ? 1 : 0);
