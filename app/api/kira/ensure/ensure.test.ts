import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS — the ensure route is the on-demand provisioning path for normal users who
// open /talk without a draft-created agent. Its invariants overlap with the create route's (org-
// scoped unique index, legacy user_id FK) but the code is separate and must hold those invariants
// independently.

const ROUTE = stripComments(readFileSync(join(__dirname, 'route.ts'), 'utf8'));

describe('/api/kira/ensure invariants', () => {
  it('gates on the kill-switch before minting a paid vendor resource', () => {
    expect(ROUTE).toMatch(/haltState\('conversations'\)/);
    expect(ROUTE).toMatch(/halt\.halted/);
  });

  it('requires an authenticated session and an organisation context', () => {
    expect(ROUTE).toMatch(/getCurrentAppUser\(\)/);
    expect(ROUTE).toMatch(/getCurrentOrganisationContext\(\)/);
  });

  it('looks up the ORGANISATION\'s existing active business agent before creating one', () => {
    expect(ROUTE).toMatch(/from\('kira_agents'\)/);
    expect(ROUTE).toMatch(/\.eq\('organisation_id', orgContext\.organisationId\)/);
    expect(ROUTE).toMatch(/\.eq\('journey_type', JOURNEY\)/);
    expect(ROUTE).toMatch(/\.eq\('status', 'active'\)/);
  });

  it('stores the legacy user_id FK (users.id) not the canonical person_id', () => {
    // The live kira_agents.user_id still carries the NOT NULL FK to users(id). A canonical
    // person_id written here would violate the constraint on insert and orphan the ElevenLabs
    // agent (the exact failure mode the 08-05 incident documented).
    expect(ROUTE).toMatch(/legacyUserId/);
    expect(ROUTE).not.toMatch(/user_id: user\.(person_id|id),/);
  });

  it('resolves the canonical person id for the tools uid, not the legacy users.id', () => {
    // The tools' ?uid= must resolve via resolveOrganisationForPerson, which accepts a canonical
    // person id. Writing the legacy users.id here would produce a silent "No organisational
    // context for user" error on every mid-call save_memory / get_conversation_context.
    expect(ROUTE).toMatch(/kiraAllTools\(APP_URL, orgContext\.personId\)/);
  });

  it('handles concurrent insert (23505) by reconciling to the winner', () => {
    // The partial unique index kira_one_active_agent_per_org_journey can reject an insert if a
    // concurrent ensure or draft approval won the race. The route must keep the winner and
    // best-effort delete the just-minted ElevenLabs agent to avoid an orphaned paid resource.
    expect(ROUTE).toMatch(/23505/);
    expect(ROUTE).toMatch(/method: 'DELETE'/);
    expect(ROUTE).toMatch(/convai\/agents\/\$\{agentId\}/);
  });

  it('does not fabricate context for an on-demand persona', () => {
    // The prompt architecture deliberately pulls current focus live via get_conversation_context /
    // recall_memory rather than baking a stale snapshot. The minimal framework here has no objective
    // and no location — an honest empty state that prevents the diesel-injector-on-the-van failure.
    expect(ROUTE).toMatch(/primaryObjective:\s*''/);
    expect(ROUTE).toMatch(/location:\s*''/);
  });
});
