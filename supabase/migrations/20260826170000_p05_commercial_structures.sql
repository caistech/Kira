-- ============================================================================
-- P0.5 STEP 3: COMMERCIAL STRUCTURES
-- ============================================================================
-- Scope: Create commercial arrangements, subscriptions, pricing tiers,
-- separate commercial from organisational identity.
--
-- EXCLUDED from this migration (deferred to Step 4+):
--   - Kira Instance separation (Step 4)
--   - Decision / Action / Outcome / Learning (Step 5)
--   - Retirement of legacy authority (Step 6)
--
-- Governing principles:
--   - Commercial Arrangement is temporal
--   - Pricing is not hardcoded
--   - Commercial history is preserved
--   - Commercial Arrangement is separate from Organisation identity
--   - Subscription is separate from Organisation identity
-- ============================================================================

-- STEP 3.1: Create pricing_tiers table
-- ---------------------------------------------------------------------------

-- Defines available pricing tiers. Not hardcoded in application.

CREATE TABLE IF NOT EXISTS pricing_tiers (
    tier_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    tier_code TEXT NOT NULL UNIQUE,
    description TEXT,
    base_price_monthly NUMERIC(10,2),
    base_price_annual NUMERIC(10,2),
    currency TEXT DEFAULT 'AUD',
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE pricing_tiers IS 'Available pricing tiers. Not hardcoded. P0.5 Step 3.';

-- STEP 3.2: Create subscriptions table
-- ---------------------------------------------------------------------------

-- Temporal subscription record for an organisation.

CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES pricing_tiers(tier_id),
    status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE subscriptions IS 'Temporal subscription for an organisation. Separate from Organisation identity. P0.5 Step 3.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_organisation_id ON subscriptions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(organisation_id) WHERE status IN ('trial', 'active');

-- STEP 3.3: Create commercial_arrangements table
-- ---------------------------------------------------------------------------

-- Temporal commercial arrangement between parties.

CREATE TABLE IF NOT EXISTS commercial_arrangements (
    arrangement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(organisation_id) ON DELETE CASCADE,
    arrangement_type TEXT NOT NULL CHECK (arrangement_type IN ('subscription', 'consulting', 'licensing', 'partnership', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    terms JSONB,
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'suspended', 'expired', 'terminated')),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE commercial_arrangements IS 'Temporal commercial arrangement. Separate from Subscription and Organisation. P0.5 Step 3.';

CREATE INDEX IF NOT EXISTS idx_commercial_arrangements_organisation_id ON commercial_arrangements(organisation_id);
CREATE INDEX IF NOT EXISTS idx_commercial_arrangements_status ON commercial_arrangements(status);

-- STEP 3.4: Create commercial_history table (audit trail)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS commercial_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    arrangement_id UUID NOT NULL REFERENCES commercial_arrangements(arrangement_id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'activated', 'suspended', 'renewed', 'expired', 'terminated')),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES persons(person_id),
    reason TEXT,
    metadata JSONB
);

COMMENT ON TABLE commercial_history IS 'Immutable audit trail of commercial arrangement changes. P0.5 Step 3.';

CREATE INDEX IF NOT EXISTS idx_commercial_history_arrangement_id ON commercial_history(arrangement_id);

-- STEP 3.5: Create subscription_history table (audit trail)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscription_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(subscription_id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'activated', 'upgraded', 'downgraded', 'past_due', 'canceled', 'expired', 'reactivated')),
    action_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    performed_by UUID REFERENCES persons(person_id),
    old_tier_id UUID REFERENCES pricing_tiers(tier_id),
    new_tier_id UUID REFERENCES pricing_tiers(tier_id),
    reason TEXT,
    metadata JSONB
);

COMMENT ON TABLE subscription_history IS 'Immutable audit trail of subscription changes. P0.5 Step 3.';

CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON subscription_history(subscription_id);

-- STEP 3.6: Backfill from legacy data
-- ---------------------------------------------------------------------------

-- Backfill subscriptions from users.subscription_status
INSERT INTO subscriptions (organisation_id, tier_id, status, valid_from, created_at)
SELECT
    u.id,
    (SELECT tier_id FROM pricing_tiers WHERE tier_code = 'trial' LIMIT 1),
    CASE
        WHEN u.subscription_status = 'trial' THEN 'trial'
        WHEN u.subscription_status = 'active' THEN 'active'
        WHEN u.subscription_status = 'canceled' THEN 'canceled'
        WHEN u.subscription_status = 'past_due' THEN 'past_due'
        ELSE 'trial'
    END,
    u.created_at,
    NOW()
FROM users u
WHERE u.subscription_status IS NOT NULL
ON CONFLICT DO NOTHING;

-- Note: If pricing_tiers table is empty, create default tiers
INSERT INTO pricing_tiers (tier_name, tier_code, description, base_price_monthly, base_price_annual)
SELECT 'Trial', 'trial', 'Free trial tier', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM pricing_tiers WHERE tier_code = 'trial');

INSERT INTO pricing_tiers (tier_name, tier_code, description, base_price_monthly, base_price_annual)
SELECT 'Starter', 'starter', 'Starter tier', 49, 490
WHERE NOT EXISTS (SELECT 1 FROM pricing_tiers WHERE tier_code = 'starter');

INSERT INTO pricing_tiers (tier_name, tier_code, description, base_price_monthly, base_price_annual)
SELECT 'Professional', 'professional', 'Professional tier', 149, 1490
WHERE NOT EXISTS (SELECT 1 FROM pricing_tiers WHERE tier_code = 'professional');

INSERT INTO pricing_tiers (tier_name, tier_code, description, base_price_monthly, base_price_annual)
SELECT 'Enterprise', 'enterprise', 'Enterprise tier', 499, 4990
WHERE NOT EXISTS (SELECT 1 FROM pricing_tiers WHERE tier_code = 'enterprise');

-- STEP 3.7: Create helper functions
-- ---------------------------------------------------------------------------

-- Function to get current subscription for an organisation
CREATE OR REPLACE FUNCTION get_organisation_subscription(p_organisation_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    tier_name TEXT,
    status TEXT,
    billing_cycle TEXT,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.subscription_id,
        pt.tier_name,
        s.status,
        s.billing_cycle,
        s.valid_from,
        s.valid_to
    FROM subscriptions s
    JOIN pricing_tiers pt ON pt.tier_id = s.tier_id
    WHERE s.organisation_id = p_organisation_id
    AND s.status IN ('trial', 'active')
    ORDER BY s.valid_from DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_organisation_subscription(UUID) IS 'Get current subscription for an organisation. P0.5 Step 3.';

-- Function to check if subscription is active
CREATE OR REPLACE FUNCTION is_subscription_active(p_organisation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions
        WHERE organisation_id = p_organisation_id
        AND status IN ('trial', 'active')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_subscription_active(UUID) IS 'Check if subscription is active. P0.5 Step 3.';

-- STEP 3.8: Migration ledger entry
-- ---------------------------------------------------------------------------

INSERT INTO migration_ledger (legacy_user_id, canonical_person_id, canonical_organisation_id, source_table, source_record_id, migration_phase, resolution_status, resolution_method, resolution_reason, migration_timestamp)
SELECT
    u.id,
    u.id,
    u.id,
    'commercial_structures',
    gen_random_uuid(),
    'bridge',
    'confirmed',
    'backfill',
    'Commercial structures created and backfilled from users.subscription_status',
    NOW()
FROM users u;

-- STEP 3.9: Verification queries
-- ---------------------------------------------------------------------------

-- Verification 1: pricing_tiers table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_tiers');

-- Verification 2: subscriptions table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions');

-- Verification 3: commercial_arrangements table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commercial_arrangements');

-- Verification 4: commercial_history table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commercial_history');

-- Verification 5: subscription_history table exists
-- Expected: true
-- SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_history');

-- Verification 6: Default pricing tiers exist
-- Expected: at least 1 row
-- SELECT COUNT(*) FROM pricing_tiers;

-- Verification 7: Subscriptions backfilled from legacy
-- Expected: count matches users with subscription_status
-- SELECT COUNT(*) FROM subscriptions;
-- SELECT COUNT(*) FROM users WHERE subscription_status IS NOT NULL;

-- Verification 8: Commercial structures are independent of Organisation identity
-- Expected: no FK from organisations to subscriptions/commercial_arrangements
-- (Verify by checking table structure)
