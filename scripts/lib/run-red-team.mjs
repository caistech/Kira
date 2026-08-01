// scripts/lib/run-red-team.mjs
//
// RUN THE RED TEAM AFTER ANYTHING THAT CHANGES HOW SHE BEHAVES.
//
// The rules the red team tests live in a 28,000-character prompt and a tool list, and BOTH are
// rewritten by the scripts this hooks into. Re-provisioning replaces an agent's tools; the
// capability patch rewrites its prompt sections. Those are precisely the moments a "never do this
// unprompted" rule can stop holding, and they are the moments nobody thinks to re-test, because the
// script reported success and success is what it was asked for.
//
// The alternative — remembering to run it — is the bet the portfolio has already lost twice: the
// memory-loop probe existed for months and ran in zero repos, and the bug it was written to catch
// reached production anyway.
//
// FAILS LOUD, NEVER SILENT. If the credentials are absent the run does not quietly skip: it prints a
// warning that says the behaviour is NOT verified. A check that does nothing looks exactly like a
// check that passed, which is the shape of failure this whole exercise exists to end.

import { spawnSync } from 'node:child_process';
import path from 'node:path';

/**
 * @param {object} opts
 * @param {boolean} opts.applied   false for a dry run — nothing changed, so nothing needs re-testing
 * @param {string}  opts.trigger   what mutated, for the log line
 */
export function runRedTeamAfterMutation({ applied, trigger }) {
  if (!applied) return;
  if (process.argv.includes('--skip-red-team')) {
    console.warn(`\n⚠  red team SKIPPED by --skip-red-team after ${trigger}. Her behaviour is not verified.`);
    return;
  }

  if (!process.env.QA_REDTEAM_EMAIL || !process.env.QA_REDTEAM_PASSWORD) {
    console.warn(
      `\n⚠  RED TEAM NOT RUN after ${trigger} — QA_REDTEAM_EMAIL / QA_REDTEAM_PASSWORD are not in\n` +
        '   this environment. Her prompt and tools just changed and NOTHING has checked that she\n' +
        '   still refuses what she is supposed to refuse. Inject the canonical QA secrets (see\n' +
        '   docs/TESTING.md) and run: node --env-file=.env.local scripts/red-team.mjs',
    );
    return;
  }

  console.log(`\n── red team (${trigger} changed her behaviour) ──`);
  const script = path.join(process.cwd(), 'scripts', 'red-team.mjs');
  const run = spawnSync(process.execPath, [script], { stdio: 'inherit', env: process.env });

  if (run.status !== 0) {
    // Deliberately not a throw: the mutation ALREADY happened and is not being undone. The exit code
    // carries the failure so CI or a wrapper sees it, while the operator still gets the full report
    // above rather than a stack trace on top of it.
    console.error('\n✗ the red team found a breach — see the transcript above. The agents were still updated.');
    process.exitCode = 1;
  }
}
