import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Every .tsx under a root, walked with node:fs so the suite takes no glob dependency. */
function tsxFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...tsxFiles(path));
    else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) out.push(path);
  }
  return out;
}

// A JSX COMMENT BETWEEN TWO SENTENCES DELETES THE SPACE BETWEEN THEM.
//
// JSX trims whitespace that touches an expression container across a line break, so
//
//     <p>
//       …the hardest thing to value.
//       {/* a note about the next line */}
//       Answer 13 short questions…
//     </p>
//
// renders as **"the hardest thing to value.Answer 13 short questions"** — on the first screen a
// cold visitor reads. Ray found it on his fourth walkthrough: "Small one, but I read everything."
//
// It is close to invisible in review: the source is correctly spaced, the comment is well-meant,
// and nothing about the diff looks wrong. It is also the exact failure mode this codebase invites,
// because the house style puts long explanatory comments right beside the thing they explain.
//
// The rule is narrow on purpose — a comment on its own line is only a problem when there is prose
// both above and below it inside the same element. A comment before an element, after an element,
// or between two JSX tags changes nothing.

/**
 * A line of rendered prose: ends in a word character or sentence punctuation, and is not markup,
 * an attribute, or code.
 */
function isProseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith('<') || t.startsWith('/') || t.startsWith('*')) return false;
  if (t.startsWith('{') || t.endsWith('{') || t.endsWith('(')) return false;
  if (/^[\w-]+=/.test(t)) return false; // an attribute
  if (/[;=]$/.test(t)) return false; // code
  // Must contain a run of letters — "13" or "})}" is not prose.
  return /\p{L}{3,}/u.test(t) && /[\p{L}.,;:!?'"’”)]$/u.test(t);
}

describe('JSX comments do not eat the space between two sentences', () => {
  const files = [...tsxFiles('app'), ...tsxFiles('components')];

  it('has files to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it.each(files)('%s', (file) => {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    const offences: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim().startsWith('{/*')) continue;
      // Walk to the end of the comment block.
      let end = i;
      while (end < lines.length && !lines[end].includes('*/}')) end++;
      const before = lines[i - 1] ?? '';
      const after = lines[end + 1] ?? '';
      if (isProseLine(before) && isProseLine(after)) {
        offences.push(`line ${i + 1}: "${before.trim().slice(-40)}" / "${after.trim().slice(0, 40)}"`);
      }
    }

    expect(offences, offences.join('\n')).toEqual([]);
  });
});
