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
  },
});
