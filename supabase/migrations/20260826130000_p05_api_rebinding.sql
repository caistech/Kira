-- ============================================================================
-- P0.5 STEP 1D: API ROUTE REBINDING — DATABASE SUPPORT
-- ============================================================================
-- Scope: Create database functions that support the API route rebinding.
-- The actual API route changes are in TypeScript (see lib/auth.ts updates).
--
-- EXCLUDED from this migration (deferred to Step 9):
--   - Legacy authority retirement
--   - Removal of users.id from knowledge tables
--
-- Governing principles:
--   - API routes resolve organisation_id via membership, not users.id
--   - organisation_id is the canonical tenant key for all data access
--   - user_id is retained for backward compatibility during transition
--   - Service-role operations are explicitly distinguished
-- ============================================================================

-- STEP 1D.1: Create function to resolve full organisational context
-- ---------------------------------------------------------------------------

-- This function returns the complete organisational context for the current
-- auth user: person_id, organisation_id, role, and membership details.

CREATE OR REPLACE FUNCTION resolve_organisational_context()
RETURNS TABLE (
    person_id UUID,
    organisation_id UUID,
    membership_id UUID,
    role TEXT,
    membership_status TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
) AS $$
DECLARE
    v_auth_user_id TEXT;
    v_person_id UUID;
BEGIN
    -- Get auth_user_id from JWT claims
    v_auth_user_id := current_setting('request.jwt.claims', true)::json->>'sub';

    IF v_auth_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Get person_id from auth_credentials
    SELECT ac.person_id INTO v_person_id
    FROM auth_credentials ac
    WHERE ac.auth_user_id = v_auth_user_id
    AND ac.status = 'active'
    LIMIT 1;

    -- Fallback: try direct mapping (users.id = auth_user_id during bridge)
    IF v_person_id IS NULL THEN
        SELECT u.id INTO v_person_id
        FROM users u
        WHERE u.auth_user_id::text = v_auth_user_id
        AND u.status = 'active'
        LIMIT 1;
    END IF;

    IF v_person_id IS NULL THEN
        RETURN;
    END IF;

    -- Return membership context, ordered by role priority
    RETURN QUERY
    SELECT
        om.person_id,
        om.organisation_id,
        om.membership_id,
        om.role,
        om.status,
        om.valid_from,
        om.valid_to
    FROM organisation_memberships om
    WHERE om.person_id = v_person_id
    AND om.status = 'active'
    AND (om.valid_to IS NULL OR om.valid_to > NOW())
    ORDER BY
        CASE om.role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'consultant' THEN 3
            WHEN 'employee' THEN 4
            WHEN 'advisor' THEN 5
            WHEN 'member' THEN 6
        END,
        om.valid_from DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_organisational_context() IS 'Resolve full organisational context for current auth user. Returns person_id, organisation_id, role, membership details. P0.5 Step 1D.';

-- STEP 1D.2: Create function to get user_id from organisation_id (backward compat)
-- ---------------------------------------------------------------------------

-- During transition, some code may need to resolve user_id from organisation_id.
-- This function provides that mapping via the membership table.

CREATE OR REPLACE FUNCTION resolve_user_id_from_organisation(p_organisation_id UUID)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Since organisations.id = users.id during bridge phase, this is a direct mapping
    -- This function will need to be updated when UUID reuse ends
    SELECT om.person_id INTO v_user_id
    FROM organisation_memberships om
    WHERE om.organisation_id = p_organisation_id
    AND om.role = 'owner'
    AND om.status = 'active'
    LIMIT 1;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_user_id_from_organisation(UUID) IS 'Resolve user_id from organisation_id (backward compat during bridge). Will need update when UUID reuse ends. P0.5 Step 1D.';

-- STEP 1D.3: Add migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'api_rebinding',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'api_rebinding',
    'API route rebinding support functions created',
    NOW()
FROM users u;
