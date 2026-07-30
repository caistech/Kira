import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Match the tsconfig `@/*` path alias so tests can import app modules the same way the app does.
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'node',
    // Loads .env.local so integration tests can reach the real Stripe test account and Supabase.
    // Unit tests don't read env and are unaffected.
    setupFiles: ['./vitest.setup.ts'],
    // Git worktrees live under .claude/worktrees when another session is working on a branch, and
    // vitest's default glob walks straight into them — running a SECOND copy of the whole suite,
    // concurrently, against the same live Supabase. The integration tests then collide on their own
    // fixtures and both copies fail, which reads as "your change broke the introducer tests" when
    // nothing is wrong with either. Default excludes have to be restated when this key is set.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.claude/worktrees/**'],
    server: {
      deps: {
        // @caistech/abn-lookup's dist uses extensionless relative imports (`./abn`), which Node's
        // ESM resolver rejects outright — so the package imports fine under the Next bundler and
        // throws ERR_MODULE_NOT_FOUND under vitest. Inlining hands it to Vite's resolver, which
        // handles the extension. The alternative was re-implementing the ABN checksum locally, i.e.
        // forking a shared package to work around a test runner.
        inline: ['@caistech/abn-lookup'],
      },
    },
  },
});
