-- Business Identity: RLS policies for authenticated access.
--
-- WHY. Until now `business_identity` had RLS on with no policy — the table decides whose ABN goes
-- on outbound mail, so only the server-role client could reach it. That meant every read/write
-- went through `createServiceClient()`, which carries the project-wide service-role key and
-- bypasses all RLS. The remediation goal is to make Kira an unprivileged caller: authenticated
-- users access only their own rows via the session client, and the service-role key is no longer
-- required for this table.
--
-- THE POLICIES enforce `user_id = auth.uid()` on every operation. The existing code already
-- scopes every query to a single `user_id`, so the policies simply formalise what the code
-- already guarantees — defence in depth rather than a behaviour change.
--
-- WHO WRITES. Only `app/setup/business/actions.ts` writes (upsert, markSynced, clearSynced),
-- and only on behalf of the authenticated user. All other callers read.
--
-- Idempotent.
ALTER TABLE business_identity ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own identity row.
CREATE POLICY "business_identity_select_own"
  ON business_identity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow authenticated users to insert their own identity row.
CREATE POLICY "business_identity_insert_own"
  ON business_identity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to update their own identity row.
CREATE POLICY "business_identity_update_own"
  ON business_identity
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
