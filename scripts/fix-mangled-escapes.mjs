// Repair regex escapes that a scripted edit turned into control characters.
//
// ⚠️ THE FAILURE, WHICH THIS REPO HAS NOW SEEN TWICE. Editing a file through a shell or Python
// string interprets `\b` as BACKSPACE (0x08) and `\f` as form feed before it ever reaches disk. The
// result compiles, typechecks, reads correctly in an editor, and matches nothing — a regex hunting
// for control characters that no business fact contains.
//
// It cost a full debugging pass here: the rule was correct, the loop was correct, the same regex
// typed into Node matched, and the module's copy returned false. `grep -P '\x08'` reported the file
// CLEAN. Only `cat -A`, which prints a backspace as `^H`, showed it.
//
// So: never write a regex through a shell string — use the editor. This exists to clean up when it
// has already happened, and to make the damage visible rather than hunting it by eye.
//
//   node scripts/fix-mangled-escapes.mjs            # report only
//   node scripts/fix-mangled-escapes.mjs --apply

import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOTS = ['lib', 'app', 'components', 'scripts'];

/** The control characters a mangled escape produces, and the escape each should have been. */
const REPAIRS = [
  [//g, '\\b'],
  [//g, '\\f'],
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(p);
  }
  return out;
}

let touched = 0;
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    // ⚠️ SKIPS ITSELF. This file contains the control characters DELIBERATELY — they are the search
    // pattern. Repairing them would turn the finder into a file that looks for the literal text
    // "\b" and silently stops finding anything, which is the same class of defect it exists to fix.
    if (path.resolve(file) === path.resolve('scripts/fix-mangled-escapes.mjs')) continue;
    const src = fs.readFileSync(file, 'utf8');
    let next = src;
    for (const [pattern, replacement] of REPAIRS) next = next.replace(pattern, replacement);
    if (next === src) continue;

    const count = (src.match(/[]/g) ?? []).length;
    console.log(`${APPLY ? 'fixed' : 'FOUND'} ${count} mangled escape(s) in ${file}`);
    if (APPLY) fs.writeFileSync(file, next);
    touched += 1;
  }
}

console.log(touched === 0 ? 'clean — no mangled escapes' : `${touched} file(s)${APPLY ? ' repaired' : ' affected (pass --apply)'}`);
