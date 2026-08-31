-- ============================================================================
-- P0.5 STEP 5: DECISION / ACTION / OUTCOME / LEARNING
-- ============================================================================
-- Scope: Create decision lifecycle model, establish organisational intelligence
-- lifecycle semantics, anchor decisions to Organisation.
--
-- EXCLUDED from this migration (deferred to Step 6+):
--   - Retirement of legacy authority (Step 6)
--
-- Governing principles:
--   - Decision is a first-class concept
--   - Action is a first-class concept
--   - Outcome is a first-class concept
--   - Learning is a first-class concept
--   - These are organisationally anchored, not transient interaction artifacts
--   - These are producers and consumers of organisational knowledge
-- ============================================================================

-- STEP 5.1: Create decisions table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS decisions (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    engagement_id UUID REFERENCES engagements(engagement_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    decision_type TEXT NOT NULL DEFAULT 'strategic' CHECK (decision_type IN ('strategic', 'operational', 'tactical', 'compliance', 'other')),
    status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected', 'implemented', 'archived')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    decided_by UUID REFERENCES persons(person_id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE decisions IS 'First-class decision entity. Organisationally anchored. P0.5 Step 5.';

CREATE INDEX IF NOT EXISTS idx_decisions_organisation_id ON decisions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_decisions_engagement_id ON decisions(engagement_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

-- STEP 5.2: Create decision_history table (audit trail)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS decision_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES decisions(decision_id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'proposed', 'approved', 'rejected', 'implemented', 'archived')),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES persons(person_id),
    reason TEXT,
    metadata JSONB
);

COMMENT ON TABLE decision_history IS 'Immutable audit trail of decision lifecycle events. P0.5 Step 5.';

CREATE INDEX IF NOT EXISTS idx_decision_history_decision_id ON decision_history(decision_id);

-- STEP 5.3: Create actions table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    decision_id UUID REFERENCES decisions(decision_id) ON DELETE SET NULL,
    engagement_id UUID REFERENCES engagements(engagement_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    action_type TEXT NOT NULL DEFAULT 'task' CHECK (action_type IN ('task', 'milestone', 'deliverable', 'review', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    assigned_to UUID REFERENCES persons(person_id),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE actions IS 'First-class action entity. Organisationally anchored. P0.5 Step 5.';

CREATE INDEX IF NOT EXISTS idx_actions_organisation_id ON actions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_actions_decision_id ON actions(decision_id);
CREATE INDEX IF NOT EXISTS idx_actions_engagement_id ON actions(engagement_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);

-- STEP 5.4: Create outcomes table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS outcomes (
    outcome_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    action_id UUID REFERENCES actions(action_id) ON DELETE SET NULL,
    engagement_id UUID REFERENCES engagements(engagement_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    outcome_type TEXT NOT NULL DEFAULT 'result' CHECK (outcome_type IN ('result', 'impact', 'benefit', 'lesson', 'other')),
    status TEXT DEFAULT 'observed' CHECK (status IN ('observed', 'validated', 'archived')),
    measured_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE outcomes IS 'First-class outcome entity. Organisationally anchored. P0.5 Step 5.';

CREATE INDEX IF NOT EXISTS idx_outcomes_organisation_id ON outcomes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_action_id ON outcomes(action_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_engagement_id ON outcomes(engagement_id);

-- STEP 5.5: Create learnings table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS learnings (
    learning_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    outcome_id UUID REFERENCES outcomes(outcome_id) ON DELETE SET NULL,
    decision_id UUID REFERENCES decisions(decision_id) ON DELETE SET NULL,
    engagement_id UUID REFERENCES engagements(engagement_id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    learning_type TEXT NOT NULL DEFAULT 'insight' CHECK (learning_type IN ('insight', 'recommendation', 'warning', 'best_practice', 'other')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    confidence NUMERIC(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE learnings IS 'First-class learning entity. Organisationally anchored. P0.5 Step 5.';

CREATE INDEX IF NOT EXISTS idx_learnings_organisation_id ON learnings(organisation_id);
CREATE INDEX IF NOT EXISTS idx_learnings_outcome_id ON learnings(outcome_id);
CREATE INDEX IF NOT EXISTS idx_learnings_decision_id ON learnings(decision_id);
CREATE INDEX IF NOT EXISTS idx_learnings_engagement_id ON learnings(engagement_id);

-- STEP 5.6: Create helper functions
-- ---------------------------------------------------------------------------

-- Function to get active decisions for an organisation
CREATE OR REPLACE FUNCTION get_organisation_decisions(p_organisation_id UUID)
RETURNS TABLE (
    decision_id UUID,
    title TEXT,
    decision_type TEXT,
    status TEXT,
    priority TEXT,
    decided_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.decision_id,
        d.title,
        d.decision_type,
        d.status,
        d.priority,
        d.decided_at
    FROM decisions d
    WHERE d.organisation_id = p_organisation_id
    AND d.status NOT IN ('archived')
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organisation_decisions(UUID) IS 'Get active decisions for an organisation. P0.5 Step 5.';

-- Function to get learnings for an organisation
CREATE OR REPLACE FUNCTION get_organisation_learnings(p_organisation_id UUID)
RETURNS TABLE (
    learning_id UUID,
    title TEXT,
    learning_type TEXT,
    confidence NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.learning_id,
        l.title,
        l.learning_type,
        l.confidence,
        l.created_at
    FROM learnings l
    WHERE l.organisation_id = p_organisation_id
    AND l.status = 'active'
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organisation_learnings(UUID) IS 'Get active learnings for an organisation. P0.5 Step 5.';

-- STEP 5.7: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'decision_lifecycle',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'new_structure',
    'Decision / Action / Outcome / Learning model created',
    NOW()
FROM users u;

-- STEP 5.8: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: All tables exist
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decisions');
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'decision_history');
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actions');
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outcomes');
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'learnings');

-- Verification 2: All tables have organisation_id FK
-- Expected: all tables reference organisations
-- (Verify by checking table structure)

-- Verification 3: Helper functions exist
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_decisions');
-- SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_organisation_learnings');
