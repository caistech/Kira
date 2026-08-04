#!/usr/bin/env node
/* ---------------------------------------------------------------------------
 * Are there colours in the components that the design system does not know about?
 *
 * WHY A SCRIPT AND NOT A RULE IN DESIGN.md. DESIGN.md §3 already says "one palette". It has said so
 * for a while, and a scan of app/ and components/ finds 28 distinct hardcoded hex values, among them
 * pink (#f472b6, #fb7185, #fce7f3), purple (#8b5cf6, #a78bfa) and amber (#fbbf24, #f59e0b) — none of
 * which are in the palette. A tester reported it as "I can't tell if I'm still on the same website",
 * a founder reviewing it cold called it "clearly designed by AI", and a designer said the colour
 * scheme does not work. All three were describing this list.
 *
 * A written rule nobody can run is a preference. This makes it a number.
 *
 * A RATCHET, NOT A WALL. Failing on all 28 today would mean either a giant unreviewable restyle or
 * (far more likely) the check being switched off in a week. So the baseline is recorded and the
 * check fails only when the count goes UP. The number is meant to come down as the palette lands;
 * lowering the baseline is a deliberate edit, which is the point.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: judge whether a colour is nice. It answers one question — is
 * this value declared in the token layer — and leaves taste to the person with the Figma file.
 *
 *   node scripts/validate-tokens.cjs            report + enforce the ratchet
 *   node scripts/validate-tokens.cjs --list     every offender with its file and line
 * ------------------------------------------------------------------------- */

const fs = require('node:fs');
const path = require('node:path');

const ROOTS = ['app', 'components'];
const EXTS = new Set(['.ts', '.tsx', '.css']);
// The token file is where hex is SUPPOSED to live... except it does not: tokens.css holds channel
// triplets. Excluded anyway so the source of truth can never fail its own check.
const EXCLUDE = ['app/tokens.css'];

/** Hardcoded colours the ratchet counts, as of 2026-08-05. Lower this as the palette lands. */
const BASELINE = 28;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(full, out);
    } else if (EXTS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

const offenders = new Map(); // hex -> [{file, line}]
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = file.split(path.sep).join('/');
    if (EXCLUDE.some((e) => rel.endsWith(e))) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // A comment explaining a colour is documentation, not a style — and this file's own header
      // would otherwise be an offender, which is the sort of thing that gets a check deleted.
      const code = line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const m of code.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        const hex = m[0].toLowerCase();
        if (!offenders.has(hex)) offenders.set(hex, []);
        offenders.get(hex).push({ file: rel, line: i + 1 });
      }
    });
  }
}

const distinct = [...offenders.keys()].sort();
const total = [...offenders.values()].reduce((n, v) => n + v.length, 0);

console.log(`hardcoded colours: ${distinct.length} distinct, ${total} occurrences (baseline ${BASELINE})`);

if (process.argv.includes('--list')) {
  for (const hex of distinct) {
    console.log(`\n  ${hex}  ×${offenders.get(hex).length}`);
    for (const { file, line } of offenders.get(hex).slice(0, 6)) console.log(`     ${file}:${line}`);
  }
  console.log('');
}

if (distinct.length > BASELINE) {
  console.error(
    `\nFAIL — ${distinct.length - BASELINE} new hardcoded colour(s) since the baseline.\n` +
      'Use a semantic role from app/tokens.css. If the colour has no role yet, add one there —\n' +
      'that is a design decision worth making once, not a hex literal worth making everywhere.\n' +
      'Run with --list to see them.',
  );
  process.exit(1);
}

if (distinct.length < BASELINE) {
  console.log(`\n${BASELINE - distinct.length} fewer than the baseline — lower BASELINE to ${distinct.length} to lock it in.`);
}
console.log('OK');
