#!/usr/bin/env node
//
// Does any UI code paint with a raw colour instead of a design token? (DESIGN.md §3)
//
// WHY THIS EXISTS. DESIGN.md decides the palette once. Nothing enforced it, and the evidence that
// enforcement is needed is in the file it replaced: `kira.warm`/`coral`/`peach`/`cream` were
// warm-palette NAMES carrying GREEN values, and alongside them sat raw `#22c55e` and `#4ade80`
// literals in three components. One of those literals was a form's primary submit button, white
// text at 1.74:1, for a readership in its sixties. Nobody chose that. It accumulated, one
// reasonable-looking className at a time, because a palette written down is a rule enforced by
// remembering — and this repo already learned twice, in six days, what that is worth
// (see check-app-chrome.mjs).
//
// A DESIGN SYSTEM NOBODY VALIDATES IS PROSE WITH NO MECHANISM. This is the mechanism.
//
// IT IS A RATCHET, NOT A CLEAN SWEEP. There are ~100 pre-existing literals in UI code. Failing on
// all of them today would mean a gate that is red on arrival, and a gate that is red on arrival is
// a gate somebody deletes in a fortnight. So the baseline is recorded per file, and the check fails
// only when a file gets WORSE or a clean file gets its first literal. Fixing lowers the baseline;
// it can never drift up.
//
// WHAT IS DELIBERATELY EXEMPT, because both are correct code rather than debt:
//
//   lib/email/**   Email HTML. CSS custom properties do not survive Outlook or Gmail — they strip
//                  or ignore them — so inline hex is REQUIRED for mail to render at all. 186 of the
//                  187 findings in lib/ were here. Gating on them would flag the one place where
//                  hardcoding is the correct engineering decision.
//   app/api/**     OG images, PDFs and mail bodies render outside the browser's CSS cascade, so
//                  there is no token to reference.
//
// HEX ONLY, DELIBERATELY. Pixel values were considered and dropped: in JSX they appear in SVG
// attributes and icon sizing, where they are legitimate, and a check with a high false-positive
// rate teaches people to ignore it. Precision matters more than coverage in something that blocks
// a merge.
//
// OPTING OUT. A file that genuinely must carry a literal — a brand asset, a third-party embed
// matching someone else's palette — declares it:
//
//     // @design-tokens-ok: PubGuard severity scale is defined by the vendor, not by us
//
// A bare marker is rejected. The reason is the point: it puts the decision in the diff, in the file
// the person is already editing.
//
//   node scripts/check-design-tokens.mjs           check
//   node scripts/check-design-tokens.mjs --update  rewrite the baseline after fixing things

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOTS = ['app', 'components', 'lib'];
const EXEMPT = [join('lib', 'email'), join('app', 'api')];
const EXTS = ['.tsx', '.ts', '.jsx', '.js', '.css'];
const BASELINE_FILE = 'design-tokens.baseline.json';

// 6- or 8-digit hex only. Three-digit (#abc) is indistinguishable from an id fragment in JSX, and a
// gate that cries wolf gets switched off.
const HEX = /#[0-9a-fA-F]{6}\b(?:[0-9a-fA-F]{2})?/g;
const OPT_OUT = /@design-tokens-ok:\s*\S+/;

const update = process.argv.includes('--update');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, out);
    } else if (EXTS.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

/** path -> number of raw colour literals, for every in-scope file that has any. */
function scan() {
  const found = {};
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    for (const file of walk(root)) {
      const rel = relative('.', file).split(sep).join('/');
      if (EXEMPT.some((ex) => file.startsWith(ex + sep))) continue;

      const source = readFileSync(file, 'utf8');
      if (OPT_OUT.test(source)) continue;

      const hits = source.match(HEX);
      if (hits && hits.length) found[rel] = hits.length;
    }
  }
  return found;
}

const current = scan();

if (update) {
  writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2) + '\n');
  const total = Object.values(current).reduce((a, b) => a + b, 0);
  console.log(`[design-tokens] baseline rewritten: ${Object.keys(current).length} files, ${total} literals.`);
  process.exit(0);
}

if (!existsSync(BASELINE_FILE)) {
  console.log(`[design-tokens] FAIL — ${BASELINE_FILE} is missing. Create it with --update.`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
const regressions = [];
const improvements = [];

for (const [file, count] of Object.entries(current)) {
  const was = baseline[file] ?? 0;
  if (count > was) regressions.push({ file, was, now: count });
}
for (const [file, was] of Object.entries(baseline)) {
  const now = current[file] ?? 0;
  if (now < was) improvements.push({ file, was, now });
}

for (const { file, was, now } of regressions) {
  console.log(
    `[design-tokens] ${file}: ${was} -> ${now} raw colour literals.\n` +
      `    Use a token from tailwind.config.ts (kira-50/500/600/700, kira-dark/charcoal/soft/mist).\n` +
      `    The ROLE picks the shade — see DESIGN.md §3.1. If this file must carry a literal, add:\n` +
      `      // @design-tokens-ok: <reason>`,
  );
}

if (improvements.length) {
  const fixed = improvements.reduce((n, i) => n + (i.was - i.now), 0);
  console.log(
    `[design-tokens] ${fixed} literal(s) removed in ${improvements.length} file(s) — ` +
      `run \`node scripts/check-design-tokens.mjs --update\` to lower the baseline so they cannot come back.`,
  );
}

if (regressions.length) {
  console.log(`[design-tokens] FAIL — ${regressions.length} file(s) gained raw colour literals.`);
  process.exit(1);
}

const total = Object.values(current).reduce((a, b) => a + b, 0);
console.log(`[design-tokens] OK — no file gained a raw colour literal (${total} pre-existing, baselined).`);
process.exit(0);
