-- ============================================================================
-- CLOSE THE DISTRIBUTOR CONTENT-ACCESS GAP (Consolidated Architecture Directive
-- §6 / Principle 5: "do not infer authority merely from a database
-- relationship")
-- ============================================================================
--
-- auth_user_can_read_org_row()'s first gate is auth_user_has_organisation_access(),
-- which already folds in the Tier-2 distributor fallback (auth_user_is_distributor_for,
-- added 20260915130000). So today a bare, unapproved distributor_portfolio row grants
-- a distributor UNRESTRICTED READ of every 'org'-visibility conversation / kira_memory /
-- genome row for that client — and the *_org_member_write policies grant unrestricted
-- WRITE the same way. No operating_agreements row is ever consulted, anywhere.
--
-- operating_agreements already exists (Stage A, 20260921000000) with exactly the shape
-- this needs (authorised_capabilities JSONB, status lifecycle) but has zero application
-- code reading or writing it — this migration is its first consumer.
--
-- Deliberately narrow: does NOT touch auth_user_has_organisation_access itself, which
-- stays the canonical gate for org-administration surfaces (organisations, portals,
-- distributor_portfolio) — a distributor overseeing organisations within its permitted
-- tree is the intended shape there. This only tightens the path for tables holding
-- private conversational/organisational CONTENT.
--
-- 'owner'-visibility rows were already safe (auth_user_can_read_org_row requires an
-- actual organisation_memberships row for those, which a distributor never has). This
-- migration's effect is entirely on 'org'-visibility reads and on all content writes.
--
-- Safe to ship: no operating_agreements rows exist yet and no current application code
-- path exercises the distributor fallback against these tables (confirmed by inspection —
-- the distributor portal today only ever displays organisations.legal_name). This closes
-- a dormant privilege before anything uses it, rather than after.
--
-- Idempotent; safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Direct-membership-only check (no distributor fallback) — factored out of
--    auth_user_has_organisation_access so this migration (and any future
--    caller) can ask "is this person an ACTUAL member" without the Tier-2
--    fallback folded in.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_has_direct_org_membership(p_organisation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_auth_user_id TEXT;
    v_person_id UUID;
BEGIN
    v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
    IF v_auth_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT person_id INTO v_person_id
    FROM auth_credentials
    WHERE auth_user_id = v_auth_user_id AND status = 'active'
    LIMIT 1;

    IF v_person_id IS NULL THEN
        SELECT id INTO v_person_id
        FROM users
        WHERE auth_user_id::text = v_auth_user_id AND status = 'active'
        LIMIT 1;
    END IF;

    IF v_person_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM organisation_memberships
        WHERE person_id = v_person_id
        AND organisation_id = p_organisation_id
        AND status = 'active'
        AND (valid_to IS NULL OR valid_to > NOW())
    );
END;
$$;

COMMENT ON FUNCTION auth_user_has_direct_org_membership(UUID) IS
  'Direct organisation_memberships check only — no distributor fallback. Distinguishes a real member from a distributor riding the Tier-2 fallback. 2026-09-21.';

-- ---------------------------------------------------------------------------
-- 2. Does the calling distributor hold an APPROVED operating_agreement,
--    authorising the named capability, over this client org? Resolves the
--    caller's own ("home") consultant/distributor org via direct membership,
--    then checks operating_agreements.consultant_org_id against it. A
--    distributor with no approved agreement returns FALSE — the capability
--    is opt-in per relationship, never implied by distributor_portfolio
--    membership alone.
--
--    Capability vocabulary is app-defined (e.g. 'view_conversations'); this
--    function is the enforcement point, not the vocabulary owner.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_has_distributor_content_agreement(p_client_org_id UUID, p_capability TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_auth_user_id TEXT;
    v_person_id UUID;
BEGIN
    v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
    IF v_auth_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT person_id INTO v_person_id
    FROM auth_credentials
    WHERE auth_user_id = v_auth_user_id AND status = 'active'
    LIMIT 1;

    IF v_person_id IS NULL THEN
        SELECT id INTO v_person_id
        FROM users
        WHERE auth_user_id::text = v_auth_user_id AND status = 'active'
        LIMIT 1;
    END IF;

    IF v_person_id IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM operating_agreements oa
        JOIN organisation_memberships om
          ON om.organisation_id = oa.consultant_org_id
        WHERE om.person_id = v_person_id
          AND om.status = 'active'
          AND (om.valid_to IS NULL OR om.valid_to > NOW())
          AND oa.client_org_id = p_client_org_id
          AND oa.status = 'approved'
          AND (oa.effective_date IS NULL OR oa.effective_date <= CURRENT_DATE)
          AND oa.authorised_capabilities ? p_capability
    );
END;
$$;

COMMENT ON FUNCTION auth_user_has_distributor_content_agreement(UUID, TEXT) IS
  'True only if the caller directly belongs to a consultant/distributor org holding an approved operating_agreements row over p_client_org_id, whose authorised_capabilities includes p_capability (e.g. view_conversations). 2026-09-21.';

-- ---------------------------------------------------------------------------
-- 3. Tighten the READ gate: 'org'-visibility content rows now require either
--    direct membership OR an approved capability-bearing operating_agreement
--    — never a bare distributor_portfolio row. 'owner'-visibility behaviour
--    is UNCHANGED (organisation_memberships owner/admin only, as before).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_can_read_org_row(p_org_id UUID, p_visibility TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_auth_user_id TEXT;
    v_is_admin BOOLEAN;
BEGIN
    IF auth_user_has_direct_org_membership(p_org_id) THEN
        -- Real member: unchanged behaviour for both visibilities.
        IF p_visibility IS NULL OR p_visibility = 'org' THEN
            RETURN TRUE;
        END IF;

        IF p_visibility = 'owner' THEN
            v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
            SELECT EXISTS (
                SELECT 1 FROM organisation_memberships om
                JOIN auth_credentials ac ON ac.person_id = om.person_id
                WHERE ac.auth_user_id = v_auth_user_id
                  AND om.organisation_id = p_org_id
                  AND om.status = 'active'
                  AND (om.valid_to IS NULL OR om.valid_to > now())
                  AND om.role IN ('owner','admin')
            ) INTO v_is_admin;
            RETURN v_is_admin;
        END IF;

        RETURN FALSE;
    END IF;

    -- Not a direct member. 'owner'-visibility rows stay closed to anyone
    -- without a real membership — distributor_portfolio never satisfies this.
    IF p_visibility = 'owner' THEN
        RETURN FALSE;
    END IF;

    -- 'org'-visibility rows: only via an approved operating_agreement,
    -- never via bare distributor_portfolio membership.
    IF NOT auth_user_is_distributor_for(p_org_id) THEN
        RETURN FALSE;
    END IF;

    RETURN auth_user_has_distributor_content_agreement(p_org_id, 'view_conversations');
END;
$$;

COMMENT ON FUNCTION auth_user_can_read_org_row(UUID, TEXT) IS
  'Role-scoped read for org content: direct members read per role as before. A distributor (no direct membership) now additionally needs an approved operating_agreements capability grant for ''org''-visibility rows; ''owner'' rows stay member-only. Closes the bare-distributor_portfolio-implies-read gap. 2026-09-21.';

-- ---------------------------------------------------------------------------
-- 4. Content WRITE policies: drop the distributor fallback entirely. No
--    current application code has a distributor writing conversations /
--    kira_memory / genome rows for a client — direct membership only.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_user_has_content_write_access(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN auth_user_has_direct_org_membership(p_org_id);
END;
$$;

COMMENT ON FUNCTION auth_user_has_content_write_access(UUID) IS
  'Write gate for conversation/memory/genome content tables — direct organisation_memberships only, no distributor fallback. 2026-09-21.';

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        AND tablename IN ('genome_entities', 'genome_facts', 'genome_relationships', 'genome_events', 'kira_memory', 'kira_knowledge', 'conversations', 'kira_agents')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_org_member_write', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL USING (auth_user_has_content_write_access(organisation_id)) WITH CHECK (auth_user_has_content_write_access(organisation_id))',
            t || '_org_member_write', t
        );
    END LOOP;
END $$;

DROP POLICY IF EXISTS conversation_messages_org_member_write ON conversation_messages;
CREATE POLICY conversation_messages_org_member_write ON conversation_messages FOR ALL
  USING (auth_user_has_content_write_access((SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)))
  WITH CHECK (auth_user_has_content_write_access((SELECT organisation_id FROM conversations WHERE id = conversation_messages.conversation_id)));
