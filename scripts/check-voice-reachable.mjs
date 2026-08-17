#!/usr/bin/env node
//
// Can an owner reach the conversation from every authenticated route? (PRODUCT_STANDARDS §6)
//
// WHY THIS EXISTS. On 15 August the persistent "Talk to Kira" button was unmounted from UserShell,
// inside a commit whose subject was about genome funnels. The instruction it cited was to remove the
// ELEVENLABS VOICE WIDGET, and was explicit about distinguishing that from the Kira shape — but
// TalkFab is not a widget, it is a <Link href="/talk">, and that commit changed no VoiceWidget line
// anywhere. So an instruction was applied to the wrong component, written up in its own commit
// message as "on instruction", and thereby became indistinguishable from an approved decision to
// everyone who read it afterwards. (It fooled a later session reading that exact comment.)
//
// The cost: from /my-genome, /drafts or /knowledge there was no route to the conversation at all —
// you had to go back to Overview first. Talking to Kira IS the product. Fourteen Priority-1 beta
// invitations went out two days into that state.
//
// Every existing signal was green and correct. The build passed, the tests passed, the site served
// 200s, the chrome check passed (nav, Settings and Sign Out were all still there). Nothing anywhere
// asked whether the product's PRIMARY INTERFACE was reachable, because §6 was enforced by one
// component continuing to exist — and a rule enforced by a component continuing to exist holds
// until someone removes it for a reason that sounds good.
//
// HOW IT DECIDES. Authenticated-ness is read from the layout CHAIN, exactly as check-app-chrome.mjs
// reads it, so the two checks agree about which routes are in scope. A route reaches voice if
// EITHER:
//
//   1. a layout in its chain mounts a component that is itself a way to the conversation — the
//      global mechanism, and the one TalkFab provides; or
//   2. the page renders a voice surface of its own, or IS a conversation route.
//
// ⚠️ IT RESOLVES THE AFFORDANCE BY BEHAVIOUR, NOT BY NAME. Asserting `UserShell` contains the string
// "TalkFab" would pass the day someone renames it and fail the day someone replaces it with
// something better. So a component counts as an affordance if it imports the voice package or links
// to a conversation route; the check then asks whether any shell in the chain mounts one of those.
// The point is "can he get to her", not "is this particular button present".
//
// OPTING OUT. Some authenticated routes genuinely should not offer it — a mid-flow wizard, or a
// surface where a voice control would collide with the one already on screen. Mark the page:
//
//     // @no-voice-route: setup wizard — the page already IS the conversation
//
// A bare marker is rejected. The reason is the point: it puts the decision in the diff, in the file
// the person is already editing. Had this existed on 15 August, unmounting the FAB would have
// turned six routes red in CI with a sentence naming what was lost.
//
//   node scripts/check-voice-reachable.mjs

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const APP = 'app';
const COMPONENTS = 'components';

/** Same signals as check-app-chrome.mjs, on purpose: the two checks must agree on what is in scope. */
const AUTH_SIGNALS = [
  /getCurrentAppUser\s*\(/,
  /getAuthUser\s*\(/,
  /isCurrentUserAdmin\s*\(/,
  /redirect\(\s*['"`]\/login/,
  /redirect\(\s*['"`]\/admin\/login/,
];

/** Routes that ARE the conversation. A page under one of these trivially reaches it. */
const CONVERSATION_ROUTES = ['/talk', '/start', '/chat', '/discovery'];

/**
 * ⚠️ TWO SIGNALS, SCORED SEPARATELY, BECAUSE THEY ARE NOT THE SAME THING.
 *
 * An EMBEDDED SHAPE is Kira actually present on the page — her avatar, transcript and mic, composed
 * from the shared transport component. A LINK is a sentence pointing at another page.
 *
 * The first version of this check treated them as equivalent and reported `/my-genome` as having
 * "its own voice surface" because line 249 contains `href="/talk"`. It has no shape on it at all,
 * and the operator was looking straight at the page while being told otherwise — twice. A check that
 * launders a text link into "the primary interface is here" is worse than no check, because it
 * certifies exactly the state it was written to prevent.
 *
 * Both still satisfy REACHABILITY, which is what §6 requires. They are reported differently so the
 * output can never again be read as a claim about presence.
 */
const SHAPE_SIGNALS = [/@caistech\/elevenlabs-convai/];
const LINK_SIGNALS = [/href=\{?['"`]\/(talk|chat|start|discovery)/];
const AFFORDANCE_SIGNALS = [...SHAPE_SIGNALS, ...LINK_SIGNALS];

const OPT_OUT = /@no-voice-route:\s*(\S.*)/;

function read(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function pageDirs(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pageDirs(full, out);
    else if (entry === 'page.tsx' || entry === 'page.ts') out.push(dir);
  }
  return out;
}

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

/**
 * Every component that is a way to the conversation, by exported name.
 *
 * Built by reading the component files rather than by listing names here, so a replacement for
 * TalkFab is recognised the day it lands instead of the day someone remembers to edit this script.
 */
// ⚠️ TRANSITIVELY, AND THAT IS THE WHOLE POINT OF THIS PASS.
//
// The real mechanism is two hops: a layout renders <UserShell>, and UserShell renders <TalkFab>.
// A check that only reads layout files sees neither, and reports /drafts, /knowledge, /requests and
// /settings as unreachable while they are perfectly fine — a false positive on four of eleven, which
// is how a check gets switched off in its first week. So: a component reaches the conversation if it
// is an affordance itself, OR it renders something that does. Repeated to a fixpoint, because the
// chain may be longer than two hops tomorrow.
const COMPONENT_SOURCES = new Map();
for (const file of walk(COMPONENTS)) {
  const src = read(file);
  const names = [
    // `async` is not optional decoration here: UserShell — the shell that carries the affordance for
    // the entire owner portal — is an `export async function`, so a pattern without it silently
    // resolved nothing and reported four healthy routes as broken.
    ...[...src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Z]\w*)/g)].map((m) => m[1]),
    ...[...src.matchAll(/export\s+const\s+([A-Z]\w*)/g)].map((m) => m[1]),
  ];
  for (const name of names) COMPONENT_SOURCES.set(name, src);
}

// Components that ARE the shape (they compose the transport), kept apart from components that
// merely link, so a page can be reported for what it actually carries.
const SHAPE_COMPONENTS = new Set();
for (const [name, src] of COMPONENT_SOURCES) {
  if (SHAPE_SIGNALS.some((r) => r.test(src))) SHAPE_COMPONENTS.add(name);
}
for (;;) {
  const before = SHAPE_COMPONENTS.size;
  for (const [name, src] of COMPONENT_SOURCES) {
    if (SHAPE_COMPONENTS.has(name)) continue;
    if ([...SHAPE_COMPONENTS].some((s) => src.includes(`<${s}`))) SHAPE_COMPONENTS.add(name);
  }
  if (SHAPE_COMPONENTS.size === before) break;
}

const AFFORDANCES = new Set();
for (const [name, src] of COMPONENT_SOURCES) {
  if (AFFORDANCE_SIGNALS.some((r) => r.test(src))) AFFORDANCES.add(name);
}
for (;;) {
  const before = AFFORDANCES.size;
  for (const [name, src] of COMPONENT_SOURCES) {
    if (AFFORDANCES.has(name)) continue;
    if ([...AFFORDANCES].some((reaching) => src.includes(`<${reaching}`))) AFFORDANCES.add(name);
  }
  if (AFFORDANCES.size === before) break;
}

// ⚠️ A SCAN THAT MATCHES NOTHING READS AS GREEN FOREVER. If no affordance component exists at all,
// the loop below would pass every route by finding nothing to fail against — which is precisely the
// state this check was written to detect. So that is a failure in itself, stated loudly.
if (AFFORDANCES.size === 0) {
  console.error(
    '[voice-reachable] FAIL — no component anywhere reaches the conversation.\n' +
      '  Nothing imports @caistech/elevenlabs-convai and nothing links to /talk, /chat, /start or\n' +
      '  /discovery. That is not a passing check, it is the defect this check exists to find.',
  );
  process.exit(1);
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
  const pageSrc = read(pageFile);
  const sources = [pageSrc, ...chain.map(read)];

  if (!sources.some((s) => AUTH_SIGNALS.some((r) => r.test(s)))) continue;
  checked += 1;

  const route = `/${relative(APP, dir).split(sep).filter((s) => !s.startsWith('(')).join('/')}` || '/';

  const optOut = pageSrc.match(OPT_OUT);
  if (optOut) {
    exempt += 1;
    console.log(`  – ${route} — exempt: ${optOut[1].trim()}`);
    continue;
  }

  // The route IS the conversation.
  if (CONVERSATION_ROUTES.some((p) => route === p || route.startsWith(`${p}/`))) {
    console.log(`  ✓ ${route} — is the conversation`);
    continue;
  }

  // Kira is actually ON this page.
  if (SHAPE_SIGNALS.some((r) => r.test(pageSrc)) || [...SHAPE_COMPONENTS].some((n) => pageSrc.includes(`<${n}`))) {
    console.log(`  ✓ ${route} — Kira shape embedded`);
    continue;
  }

  // Only a sentence pointing elsewhere. Reachable, and stated as what it is.
  if (LINK_SIGNALS.some((r) => r.test(pageSrc))) {
    console.log(`  ~ ${route} — link only (no shape on the page)`);
    continue;
  }

  // A shell above it carries one. This is the line that goes red when the FAB is unmounted.
  const viaShell = chain.some((f) => {
    const src = read(f);
    return [...AFFORDANCES].some((n) => src.includes(`<${n}`));
  });
  if (viaShell) {
    console.log(`  ✓ ${route} — via the shell`);
    continue;
  }

  failures += 1;
  console.log(
    `  ✗ ${route} — authenticated, and there is NO way to reach Kira from it.\n` +
      `      Talking to her is the product; this route offers no route to her at all.\n` +
      `      Either mount a voice affordance in a layout above it (the global fix — one change\n` +
      `      covers every page), give the page its own voice surface, or mark the page\n` +
      `      // @no-voice-route: <why this route must not offer it>`,
  );
}

console.log(
  `\n[voice-reachable] ${checked} authenticated route(s): ` +
    `${checked - failures - exempt} reach the conversation, ${exempt} exempt, ${failures} FAILING`,
);
process.exit(failures > 0 ? 1 : 0);
