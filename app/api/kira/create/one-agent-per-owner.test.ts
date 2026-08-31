import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS — O1 / D2 (P2.4-A remigration).
 //
 // The database DECLARED one agent per owner per journey (user_id, journey_type) 2026-01-20 →
 // 2026-08-30. That index was LEGACY and is dropped by the P2.4-A migration
 // (20260830170000_kira_agents_unique_constraint.sql). The CANONICAL invariant is now:
 //
 //   CREATE UNIQUE INDEX kira_one_active_agent_per_org_journey
 //   ON public.kira_agents (organisation_id, journey_type) WHERE status = 'active';
 //
 // The route now resolves the owner's organisation context and re-briefs the ORGANISATION'S
 // existing active agent for the journey — not the user's. This test asserts the new
 // org-scoped invariant and route behaviour.

const ROUTE = stripComments(readFileSync(join(__dirname, 'route.ts'), 'utf8'));
const MIGRATIONS = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');

describe('the database declares one active agent per ORGANISATION per journey', () => {
  it('the org-scoped partial unique index exists in a migration', () => {
    // If this is ever dropped, the route's reuse branch becomes the ONLY thing standing between an
    // owner and a second Kira — worth failing loudly rather than discovering later.
    const sql = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
      .join('\n');
    expect(sql).toMatch(/kira_one_active_agent_per_org_journey/);
    expect(sql).toMatch(/ON public\.kira_agents \(organisation_id, journey_type\)\s*WHERE status = 'active'/);
  });
});

describe('/api/kira/create honours it', () => {
  it('looks for the ORGANISATION\'s existing active agent before creating one', () => {
    expect(ROUTE).toMatch(/from\('kira_agents'\)/);
    expect(ROUTE).toMatch(/\.eq\('organisation_id', organisationContext\.organisationId\)/);
    expect(ROUTE).toMatch(/\.eq\('journey_type', draft\.journey_type\)/);
    expect(ROUTE).toMatch(/\.eq\('status', 'active'\)/);
  });

  it('re-briefs the existing agent with a PATCH rather than minting a second one', () => {
    expect(ROUTE).toMatch(/method: 'PATCH'/);
    expect(ROUTE).toMatch(/convai\/agents\/\$\{agentId\}/);
  });

  it('updates the row when reusing, and only inserts for the first', () => {
    // The id must be preserved on the update: kira_memory is keyed by kira_agent_id, so a new row
    // would strand everything she has ever learned about him. Re-doing the brief is a correction,
    // not a request to be forgotten.
    expect(ROUTE).toMatch(/reusing\s*\?[\s\S]*\.update\(/);
    expect(ROUTE).toMatch(/\.eq\('id', existingActive!\.id\)/);
  });

  it('does not still claim that each draft creates a new agent', () => {
    expect(ROUTE).not.toMatch(/Each draft creates a NEW agent/);
    expect(ROUTE).not.toMatch(/Users can have multiple agents/);
  });

  it('releases the draft claim when the update fails, as the create path does', () => {
    // A draft stranded 'used' with a brief that never reached her is worse than an error: the
    // button has been pressed, and pressing it again does nothing.
    const patchFailure = ROUTE.slice(ROUTE.indexOf('elevenlabs_update'), ROUTE.indexOf('Post-create'));
    expect(patchFailure).toMatch(/from\('kira_drafts'\)/);
    expect(patchFailure).toMatch(/used_at: null/);
  });
});
