import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { stripComments } from '@/lib/source-scan';

// WHY THIS FILE EXISTS — P5 canonical-authorization residual bug (2026-09-08).
//
// A newly-redeemed beta user hit 403 on POST /api/kira/chat/start while OPENING the same agent
// via /api/kira/agent worked. Debug response proved the tenant boundary was intact:
//
//   agentOrganisationId     = contextOrganisationId   (same canonical org)  ✅
//   agentPersonId           != contextPersonId        (different persons)   ❌ 403 source
//
// The route was still enforcing the LEGACY "caller MUST be the agent's person owner" check even
// though the agent is organisation-scoped (kira_agents.organisation_id). Under the canonical
// identity model an org member must be able to start the org's agent regardless of which person
// row created it. This test pins that behaviour so the person-owner-only check cannot creep back.

const ROUTE = stripComments(readFileSync(join(__dirname, 'route.ts'), 'utf8'));

describe('/api/kira/chat/start is ORGANISATION-scoped, not person-owner-scoped', () => {
  it('loads the agent with its organisation_id so tenant scope can be checked', () => {
    expect(ROUTE).toMatch(/\.select\('elevenlabs_agent_id, status, person_id, organisation_id'\)/);
  });

  it('requires a canonical organisation context before authorising', () => {
    expect(ROUTE).toMatch(/getCurrentOrganisationContext\(\)/);
    expect(ROUTE).toMatch(/Not signed in or no organisation access/);
    expect(ROUTE).toMatch(/status: 401/);
  });

  it('allows an org member to start an org agent — same org, different person', () => {
    // The authorisation MUST be based on agent.organisation_id === context.organisationId, not on
    // the legacy person-owner equality. A busy employee opening the owner-created agent is the
    // exact production case that was returning 403.
    expect(ROUTE).toMatch(/kiraAgent\.organisation_id === organisationContext\.organisationId/);
  });

  it('still denies when the caller is NOT an admin, NOT the owner, AND outside the org', () => {
    // Organisation isolation MUST be preserved: a member of org A cannot start an agent of org B.
    expect(ROUTE).toMatch(/if \(!admin && !isOrgMember && !isOwner\)/);
    expect(ROUTE).toMatch(/Not authorized for this agent/);
    expect(ROUTE).toMatch(/status: 403/);
  });

  it('keeps the org-admin override and the agent-status gate', () => {
    expect(ROUTE).toMatch(/isCurrentUserAdmin\(\)/);
    expect(ROUTE).toMatch(/kiraAgent\.status !== 'active'/);
    expect(ROUTE).toMatch(/Kira agent is not active/);
  });

  it('does not still enforce the legacy person-owner equality', () => {
    // The exact production failure branch — `person_id !== context.personId` as the ONLY gate.
    expect(ROUTE).not.toMatch(/kiraAgent\.person_id !== organisationContext\.personId[^\n]*status: 403/);
    expect(ROUTE).not.toMatch(/the caller must be the agent's owner OR an org admin/i);
  });
});