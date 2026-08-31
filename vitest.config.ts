import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // TS BEFORE MJS — so a bare specifier resolves to the SAME file here as it does in the app.
    //
    // `lib/kira/uid-tools.ts` and `lib/kira/uid-tools.mjs` both exist on purpose: the .mjs holds the
    // tool-NAME list that plain scripts (reprovision, verify) must read, and the .ts holds the
    // handlers. Vite's default order puts '.mjs' ahead of '.ts', while Next resolves '.ts' first —
    // so `import { handleKiraSaveMemory } from './uid-tools'` silently found the wrong module under
    // vitest and the export came back undefined. Typechecking passes either way, because tsc uses
    // Next's order, which is what makes this the kind of divergence you only meet at runtime.
    extensions: ['.ts', '.tsx', '.mts', '.mjs', '.js', '.jsx', '.json'],
      alias: {
        // Match the tsconfig `@/*` path alias so tests can import app modules the same way the app does.
        '@': path.resolve(__dirname, './'),
        // `server-only` is a Next build-time guard with no runtime module behind it: importing a file

      // that declares it fails to resolve under vitest, and it fails for the whole IMPORT CHAIN, so
      // one new import can take out a test file that never touched server code. Stubbed rather than
      // removed from the modules that declare it — the guard is doing its job in the app, and
      // weakening real code to satisfy a test runner is the wrong direction.
      'server-only': path.resolve(__dirname, 'vitest.server-only-stub.ts'),
    },
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
