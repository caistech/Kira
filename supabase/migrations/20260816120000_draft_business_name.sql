-- What the business is CALLED, asked at setup.
--
-- ⚠️ WHY NOT `business_identity`. That is the obvious home and it is the wrong one: `legal_name`,
-- `abn` and the address are all NOT NULL there, because that table exists to make a compliant
-- commercial email possible. Half-filling it to capture a trading name would either fail the insert
-- or produce a row that claims to be a sender identity and is not — and `canSend` would then be
-- deciding on a record nobody completed.
--
-- THE DEFECT THIS CLOSES. Nothing in setup or in conversation ever asked. So the handover document
-- fell back to its deliberate placeholder and Ray was about to send his broker a file headed
-- "This business":
--
--   "Not my company's name — she never asked me for it, not once, in setup or in conversation. So
--    the thing I would hand a broker is a document called This business about an unnamed company
--    containing nine empty sections. I would not send that to a man I want to take me seriously.
--    I'd be embarrassed."
--
-- The placeholder itself stays — a handover document must NEVER be titled with a person's name, and
-- an earlier version titled one "Ray". This gives the fallback something better to fall back FROM.
--
-- Nullable and additive: every existing draft is unaffected and the manual keeps its placeholder
-- until an owner actually answers.

alter table kira_drafts add column if not exists business_name text;

comment on column kira_drafts.business_name is
  'What the owner calls the business. Titles the handover document when no business_identity row exists yet.';
