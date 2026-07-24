// Next 16 removed the `next lint` command, so ESLint runs via its own CLI against this flat config.
// eslint-config-next@16 ships a native flat-config array — consume it directly (no FlatCompat bridge,
// which chokes on the config's self-referential plugins with a "circular structure" error).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

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
