-- Workstream C — the introducer channel.
--
-- Brokers, accountants and advisors introduce owners to Kira and earn on the subscription for as
-- long as it's collected. This is the schema that records WHO introduced WHOM, permanently.
--
-- The governing constraint (BROKER_CHANNEL_BUILD_STATE, cross-cutting #23): an introducer is a
-- READ-ONLY STATUS PROJECTION over an owner. They see that their referral is progressing — stage,
-- valuation movement — and never its contents. Nothing here gives an introducer a path to
-- conversations, transcripts or memory; the owner's `tenantId` scope is untouched.
--
-- Product-local by decision (2026-07-26): the board is Kira's own tables, mirroring the
-- F2K-Projects pipeline shape so a later @caistech extraction is a lift rather than a rewrite
-- (SHARED_SERVICES "convergent shape, then extract"). The shared ROLE MODEL is still consumed from
-- @caistech/coordination-sdk, and the attribution cookie from @caistech/attribution.
--
-- Idempotent; safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Introducers — the referring parties
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS introducers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT NOT NULL UNIQUE,
    name         TEXT,
    -- The brokerage. The payee may be the firm rather than the individual, so both are recorded.
    org_name     TEXT,
    org_abn      TEXT,
    payee_type   TEXT NOT NULL DEFAULT 'individual' CHECK (payee_type IN ('individual', 'entity')),
    payee_name   TEXT,
    -- 'introducer' and 'broker' are the coordination-sdk role names (synonyms, identical
    -- permissions: view_status only). Stored so the server-side gate reads the same vocabulary the
    -- shared role model uses instead of inventing a second one.
    role         TEXT NOT NULL DEFAULT 'introducer' CHECK (role IN ('introducer', 'broker')),
    status       TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
    -- The token that appears in their /r/<token> link. Public by nature (it's in a URL), which is
    -- exactly why it grants nothing on its own — it only stamps attribution.
    referral_token TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS introducers_token_idx ON introducers(referral_token);
ALTER TABLE introducers ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Magic links — how an introducer signs in
--
-- Same shape as @caistech/coordination-sdk's engine (SHA-256 token hash at rest, expiry,
-- revocation, last-used), kept local because that package's magic links live in the coordination
-- project's own Supabase instance and Kira's introducers belong in Kira's database.
--
-- The token is NEVER stored in plaintext: a leaked table must not be a set of working logins.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS introducer_magic_links (
    token_hash      TEXT PRIMARY KEY,
    introducer_id   UUID NOT NULL REFERENCES introducers(id) ON DELETE CASCADE,
    allowed_actions TEXT[] NOT NULL DEFAULT ARRAY['view_status'],
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS introducer_magic_links_introducer_idx ON introducer_magic_links(introducer_id);
ALTER TABLE introducer_magic_links ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Introductions — the referral record
--
-- One row per owner an introducer has sent, created at first touch (before an account exists) and
-- linked to the user when they sign up. This is what the introducer's board reads.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS introductions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    introducer_id  UUID NOT NULL REFERENCES introducers(id) ON DELETE CASCADE,
    -- NULL until the owner actually signs up. A click is an introduction too — the introducer
    -- should see that someone they sent is looking, not just that someone converted.
    owner_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    prospect_email TEXT,
    first_touch_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status         TEXT NOT NULL DEFAULT 'clicked'
                   CHECK (status IN ('clicked', 'signed_up', 'trialing', 'paying', 'lapsed')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS introductions_introducer_idx ON introductions(introducer_id);
CREATE UNIQUE INDEX IF NOT EXISTS introductions_owner_uniq
    ON introductions(owner_user_id) WHERE owner_user_id IS NOT NULL;
ALTER TABLE introductions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Attribution on the owner (@caistech/attribution)
--
-- referrer_id + first_touch_at are what the commission ledger will read. referral_source_text is
-- the self-reported "who told you about Kira?" fallback for someone who arrived without a link —
-- deliberately NOT protected below, because it is a hint for a human to act on, not an attribution.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS referrer_id          UUID REFERENCES introducers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS first_touch_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS referral_source_text TEXT;

CREATE INDEX IF NOT EXISTS idx_users_referrer ON users(referrer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Attribution overrides — the audit trail the immutability guard writes to
--
-- Kira has no general audit_log table, so the guard gets its own. Without somewhere to write, a
-- permitted override would leave no trace, which defeats the point of allowing one at all.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS attribution_overrides (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name    TEXT NOT NULL,
    row_id        UUID NOT NULL,
    field_changed TEXT NOT NULL,
    old_value     JSONB,
    new_value     JSONB,
    actor_email   TEXT,
    reason        TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE attribution_overrides ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. First-touch immutability (@caistech/attribution migration.sql, adapted)
--
-- Once set, referrer_id and first_touch_at cannot change. NULL → value is the first write and is
-- allowed; value → different value raises. An override requires deliberate intent (a request
-- header or a session var) and always writes an attribution_overrides row.
--
-- This lives in the database rather than the application because an app-layer rule is one
-- forgotten admin screen, bulk import or support script away from silently reassigning a
-- commission — and the person who loses it would never know.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_attribution_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_protected   TEXT[] := ARRAY['referrer_id', 'first_touch_at'];
  v_key         TEXT;
  v_old         JSONB := to_jsonb(OLD);
  v_new         JSONB := to_jsonb(NEW);
  v_override    BOOLEAN := FALSE;
  v_headers     JSONB;
  v_actor_email TEXT;
  v_reason      TEXT;
BEGIN
  BEGIN
    v_override := COALESCE(NULLIF(current_setting('app.allow_attribution_override', TRUE), ''), 'false')::BOOLEAN;
  EXCEPTION WHEN OTHERS THEN
    v_override := FALSE;
  END;

  BEGIN
    v_headers := current_setting('request.headers', TRUE)::JSONB;
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;
  IF v_headers IS NOT NULL THEN
    IF lower(COALESCE(v_headers->>'x-allow-attribution-override', '')) = 'true' THEN
      v_override := TRUE;
    END IF;
    v_actor_email := NULLIF(v_headers->>'x-actor-email', '');
    v_reason      := NULLIF(v_headers->>'x-audit-reason', '');
  END IF;
  v_actor_email := COALESCE(v_actor_email, NULLIF(current_setting('app.actor_email', TRUE), ''));
  v_reason      := COALESCE(v_reason, NULLIF(current_setting('app.audit_reason', TRUE), ''));

  FOREACH v_key IN ARRAY v_protected LOOP
    IF v_old ? v_key
       AND (v_old ->> v_key) IS NOT NULL
       AND (v_old ->> v_key) IS DISTINCT FROM (v_new ->> v_key) THEN
      IF NOT v_override THEN
        RAISE EXCEPTION
          'Attribution is first-touch immutable: % cannot be changed once set (row %). Admin override required.',
          v_key, OLD.id
          USING ERRCODE = 'check_violation';
      END IF;

      INSERT INTO attribution_overrides (
        table_name, row_id, field_changed, old_value, new_value, actor_email, reason
      ) VALUES (
        TG_TABLE_NAME, NEW.id, v_key, v_old -> v_key, v_new -> v_key,
        COALESCE(v_actor_email, 'system'), v_reason
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION enforce_attribution_immutability IS
  'BEFORE UPDATE guard on users: blocks changes to referrer_id / first_touch_at once set (first-touch wins). NULL->value allowed. A change requires x-allow-attribution-override:true (or app.allow_attribution_override) and is written to attribution_overrides.';

DROP TRIGGER IF EXISTS trg_attribution_immutable_users ON public.users;
CREATE TRIGGER trg_attribution_immutable_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION enforce_attribution_immutability();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. The status projection — the content wall, in SQL
--
-- What an introducer is allowed to see about an owner they introduced: identity enough to
-- recognise them, where they are in the journey, and whether the valuation is moving. NO
-- conversations, NO transcripts, NO memory, NO knowledge — those columns are not selectable here,
-- so a future careless `select *` on the app side cannot leak them.
--
-- SECURITY DEFINER + an explicit introducer_id argument: the caller passes the introducer resolved
-- from their own verified session, and the function can only ever return that introducer's rows.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION introducer_owner_projection(p_introducer_id UUID)
RETURNS TABLE (
  introduction_id  UUID,
  status           TEXT,
  first_touch_at   TIMESTAMPTZ,
  owner_label      TEXT,
  owner_since      TIMESTAMPTZ,
  valuation_gap    NUMERIC,
  valuation_today  NUMERIC,
  readiness        NUMERIC,
  valuation_at     TIMESTAMPTZ
) AS $$
  SELECT
    i.id,
    i.status,
    i.first_touch_at,
    -- A recognisable label, not a contact record: first name + the initial of the last.
    COALESCE(
      NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || LEFT(COALESCE(u.last_name, ''), 1)), ''),
      SPLIT_PART(COALESCE(u.email, i.prospect_email, ''), '@', 1)
    ),
    u.created_at,
    v.gap,
    v.worth_today,
    v.readiness,
    v.updated_at
  FROM introductions i
  LEFT JOIN users u ON u.id = i.owner_user_id
  LEFT JOIN business_valuations v ON v.user_id = i.owner_user_id
  WHERE i.introducer_id = p_introducer_id
  ORDER BY i.first_touch_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

COMMENT ON FUNCTION introducer_owner_projection IS
  'The ONLY sanctioned read path from an introducer to their owners. Returns status + valuation movement, never content. Pass the introducer id resolved from a verified session.';

REVOKE ALL ON FUNCTION introducer_owner_projection(UUID) FROM PUBLIC, anon, authenticated;
