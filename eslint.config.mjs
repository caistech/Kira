// Next 16 removed the `next lint` command, so ESLint runs via its own CLI against this flat config.
// eslint-config-next@16 ships a native flat-config array — consume it directly (no FlatCompat bridge,
// which chokes on the config's self-referential plugins with a "circular structure" error).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
// DECLARED HERE BECAUSE THE BLOCK BELOW SETS ONE OF ITS RULES.
//
// Flat config resolves a rule's plugin within the config object that names the rule — it does not
// inherit the plugin from an earlier object in the array. So `'react-hooks/set-state-in-effect':
// 'warn'` below, sitting in an object with no `plugins` key, made ESLint refuse to start at all:
//
//     A configuration object specifies rule "react-hooks/set-state-in-effect",
//     but could not find plugin "react-hooks".
//
// That is a HARD exit 2 before a single file is read, so `npm run lint` reported nothing about the
// code — and the portfolio-gate Lint step had been failing on every push and every PR since
// eslint-config-next moved the plugin out of the scope this file was relying on. A gate that cannot
// start is indistinguishable in a red tick from a gate that found something, which is why it sat.
import reactHooks from 'eslint-plugin-react-hooks';

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**', 'next-env.d.ts', 'public/**'],
  },
  ...nextCoreWebVitals,
  {
    // This repo had no working ESLint until now (Next 16 removed `next lint`), so a large backlog of
    // pre-existing findings surfaced on first run. Rather than block CI on the whole legacy backlog,
    // the noisy-cosmetic rule is disabled and the pre-existing best-practice violations are demoted to
    // warnings (still surfaced in CI logs, non-blocking). Address incrementally; new code should keep
    // warnings from growing.
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Cosmetic: unescaped apostrophes/quotes in JSX text (e.g. "I'm Kira"). Universally noisy.
      'react/no-unescaped-entities': 'off',
      // <a href="/…"> to an internal route should be <Link>; pre-existing across many pages.
      '@next/next/no-html-link-for-pages': 'warn',
      // Newer react-hooks perf hint (setState synchronously in an effect body); pre-existing pattern.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
