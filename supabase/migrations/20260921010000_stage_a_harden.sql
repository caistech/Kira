-- ============================================================================
-- Stage-A Hardening — RLS on hierarchy tables + mint portals/portal_configs
--
-- WHAT THIS ADDS (all additive, idempotent):
--   1. RLS + canonical org-scoped policies on the four Stage-A tables:
--      consultant_frameworks, consultant_genomes, operating_agreements, truth_comparisons
--   2. `portals` table — canonical portal-lane URL per organisation
--   3. `portal_configs` table — lane/persona config per portal
--   4. RLS + canonical policies on portals + portal_configs
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS: consultant_frameworks
-- ---------------------------------------------------------------------------
ALTER TABLE consultant_frameworks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultant_frameworks_org_member_select ON consultant_frameworks;
CREATE POLICY consultant_frameworks_org_member_select ON consultant_frameworks
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS consultant_frameworks_org_admin_manage ON consultant_frameworks;
CREATE POLICY consultant_frameworks_org_admin_manage ON consultant_frameworks
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = consultant_frameworks.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = consultant_frameworks.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')));

-- ---------------------------------------------------------------------------
-- 2. RLS: consultant_genomes
-- ---------------------------------------------------------------------------
ALTER TABLE consultant_genomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultant_genomes_org_member_select ON consultant_genomes;
CREATE POLICY consultant_genomes_org_member_select ON consultant_genomes
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS consultant_genomes_org_admin_manage ON consultant_genomes;
CREATE POLICY consultant_genomes_org_admin_manage ON consultant_genomes
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = consultant_genomes.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = consultant_genomes.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')));

-- ---------------------------------------------------------------------------
-- 3. RLS: operating_agreements (scoped by consultant_org_id OR client_org_id)
-- ---------------------------------------------------------------------------
ALTER TABLE operating_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operating_agreements_org_member_select ON operating_agreements;
CREATE POLICY operating_agreements_org_member_select ON operating_agreements
    FOR SELECT USING (
        auth_user_has_organisation_access(consultant_org_id)
        OR (client_org_id IS NOT NULL AND auth_user_has_organisation_access(client_org_id))
    );

DROP POLICY IF EXISTS operating_agreements_org_admin_manage ON operating_agreements;
CREATE POLICY operating_agreements_org_admin_manage ON operating_agreements
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE (
            om.organisation_id = operating_agreements.consultant_org_id
            OR (operating_agreements.client_org_id IS NOT NULL AND om.organisation_id = operating_agreements.client_org_id)
        )
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE (
            om.organisation_id = operating_agreements.consultant_org_id
            OR (operating_agreements.client_org_id IS NOT NULL AND om.organisation_id = operating_agreements.client_org_id)
        )
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')));

-- ---------------------------------------------------------------------------
-- 4. RLS: truth_comparisons (scoped by entity_org_id OR parent_org_id)
-- ---------------------------------------------------------------------------
ALTER TABLE truth_comparisons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS truth_comparisons_org_member_select ON truth_comparisons;
CREATE POLICY truth_comparisons_org_member_select ON truth_comparisons
    FOR SELECT USING (
        auth_user_has_organisation_access(entity_org_id)
        OR auth_user_has_organisation_access(parent_org_id)
    );

DROP POLICY IF EXISTS truth_comparisons_org_admin_manage ON truth_comparisons;
CREATE POLICY truth_comparisons_org_admin_manage ON truth_comparisons
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE (
            om.organisation_id = truth_comparisons.entity_org_id
            OR om.organisation_id = truth_comparisons.parent_org_id
        )
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE (
            om.organisation_id = truth_comparisons.entity_org_id
            OR om.organisation_id = truth_comparisons.parent_org_id
        )
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')));

-- ---------------------------------------------------------------------------
-- 5. PORTALS — canonical portal-lane URL per organisation
--    One row per org. The runner (autobootstrap-portals.mjs) upserts the
--    /talk URL for each lane the hierarchy minted.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portals (
    portal_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL UNIQUE REFERENCES organisations(organisation_id),
    portal_url      TEXT NOT NULL,
    journey_type    TEXT NOT NULL DEFAULT 'business'
        CHECK (journey_type IN ('business','consultant','distributor')),
    portal_level    TEXT NOT NULL DEFAULT 'business'
        CHECK (portal_level IN ('portfolio','project','distributor','client_org')),
    slug            TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portals_organisation_id ON portals(organisation_id);
CREATE INDEX IF NOT EXISTS idx_portals_slug ON portals(slug) WHERE slug IS NOT NULL;

ALTER TABLE portals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portals_org_member_select ON portals;
CREATE POLICY portals_org_member_select ON portals
    FOR SELECT USING (auth_user_has_organisation_access(organisation_id));

DROP POLICY IF EXISTS portals_org_admin_manage ON portals;
CREATE POLICY portals_org_admin_manage ON portals
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = portals.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM organisation_memberships om
        WHERE om.organisation_id = portals.organisation_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')));

-- ---------------------------------------------------------------------------
-- 6. PORTAL_CONFIGS — lane/persona-specific config per portal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_configs (
    config_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_id   UUID NOT NULL REFERENCES portals(portal_id) ON DELETE CASCADE,
    persona     TEXT NOT NULL DEFAULT 'owner'
        CHECK (persona IN ('owner','admin','staff','consultant','distributor')),
    kira_agent_id UUID,
    features    JSONB NOT NULL DEFAULT '{}',
    status      TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','inactive')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_configs_unique_persona
    ON portal_configs(portal_id, persona);

CREATE INDEX IF NOT EXISTS idx_portal_configs_portal_id ON portal_configs(portal_id);

ALTER TABLE portal_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_configs_via_portal_select ON portal_configs;
CREATE POLICY portal_configs_via_portal_select ON portal_configs
    FOR SELECT USING (EXISTS (SELECT 1 FROM portals p
        WHERE p.portal_id = portal_configs.portal_id
          AND auth_user_has_organisation_access(p.organisation_id)));

DROP POLICY IF EXISTS portal_configs_via_portal_manage ON portal_configs;
CREATE POLICY portal_configs_via_portal_manage ON portal_configs
    FOR ALL USING (EXISTS (SELECT 1 FROM portals p
        JOIN organisation_memberships om
            ON om.organisation_id = p.organisation_id
        WHERE p.portal_id = portal_configs.portal_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM portals p
        JOIN organisation_memberships om
            ON om.organisation_id = p.organisation_id
        WHERE p.portal_id = portal_configs.portal_id
          AND om.person_id = (SELECT person_id FROM auth_credentials WHERE auth_user_id = (current_setting('request.jwt.claims', true))::json ->> 'sub')
          AND om.status = 'active' AND om.role IN ('admin','owner','superadmin')));
