import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS — O1 / D2.
//
// The database has declared one agent per owner per journey since 2026-01-20:
//
//   CREATE UNIQUE INDEX kira_one_active_agent_per_journey
//   ON public.kira_agents (user_id, journey_type) WHERE status = 'active';
//
// and the migration that added it says, in a comment, "this matches backend logic". It did not.
// This route inserted a fresh 'active' row for every draft, and its own header stated the
// assumption: "Each draft creates a NEW agent. Users can have multiple agents."
//
// On a second draft that produced, in order: a new ElevenLabs agent (a real, billed vendor
// resource), an INSERT rejected by the index, an error swallowed as non-fatal on the reasoning that
// "agent was created in ElevenLabs, we should still return it", and a redirect to /chat/<the new
// agent> — an agent no server-side lookup can resolve, because /talk and everything else resolve
// through kira_agents, which still points at the old one.
//
// ⚠️ NOT YET INCURRED, AND SAY SO. Checked against production 2026-08-09: 11 agents named Kira_*
// at ElevenLabs, 0 with no kira_agents row, and 0 duplicate (user, journey, status) rows. Nobody
// had completed a second draft yet. This was a latent defect, and the index is what kept it latent.
//
// A route with this many external dependencies cannot be unit-tested end to end, so this asserts
// the two things that can be established without a network: the DB still declares the invariant,
// and the route still honours it. Comments are stripped, because the fix's own comments quote the
// wording they replaced.

const ROUTE = stripComments(readFileSync(join(__dirname, 'route.ts'), 'utf8'));
const MIGRATIONS = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');

describe('the database still declares one active agent per owner per journey', () => {
  it('the partial unique index exists in a migration', () => {
    // If this is ever dropped, the route's reuse branch becomes the ONLY thing standing between an
    // owner and a second Kira — worth failing loudly rather than discovering later.
    const sql = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'))
      .join('\n');
    expect(sql).toMatch(/kira_one_active_agent_per_journey/);
    expect(sql).toMatch(/ON public\.kira_agents \(user_id, journey_type\)\s*WHERE status = 'active'/);
  });
});

describe('/api/kira/create honours it', () => {
  it('looks for the owner\'s existing active agent before creating one', () => {
    expect(ROUTE).toMatch(/from\('kira_agents'\)/);
    expect(ROUTE).toMatch(/\.eq\('user_id', user\.id\)/);
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
