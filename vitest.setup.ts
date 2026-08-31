// vitest.setup.ts
// Load .env.local for tests that talk to real services.
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(__dirname, '.env.local'), quiet: false });
