// business-genome/test-support/test-db.ts
//
// The ONE Supabase client these DB-integration tests may use. Deliberately NOT
// createServiceClientV2() — that reads NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SECRET_KEY, which is
// PRODUCTION, and every one of these tests INSERTs real rows (organisations, genome_entities,
// kira_agents...). Before this file existed, running this suite left ~150 leftover test orgs in
// production over time, heavy enough to crash a live admin page rendering the org picker.
//
// TEST_SUPABASE_URL / TEST_SUPABASE_SECRET_KEY point at a dedicated, permanent test Supabase
// project (schema-identical to prod, via the same migrations, zero real data). Locally or in CI
// without them configured, `hasTestDb` is false and every consumer skips cleanly via
// `describe.skipIf(!hasTestDb)` — never falls back to prod, never fails with a confusing raw
// "supabaseUrl is required" from inside @supabase/supabase-js.

import { createClient } from '@supabase/supabase-js';

export const hasTestDb = Boolean(
  process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SECRET_KEY,
);

export function createTestServiceClient() {
  if (!hasTestDb) {
    throw new Error(
      'TEST_SUPABASE_URL / TEST_SUPABASE_SECRET_KEY not set — guard the call site with ' +
        'describe.skipIf(!hasTestDb) rather than calling this unconditionally.',
    );
  }
  return createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
