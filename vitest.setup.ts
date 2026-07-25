// vitest.setup.ts
// Load .env.local for tests that talk to real services. Tests that need credentials check for them
// explicitly and skip when absent — nothing here fails a run on a machine without a .env.local.

import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
