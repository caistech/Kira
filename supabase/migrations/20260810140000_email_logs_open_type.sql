-- email_logs.email_type carried a CLOSED CHECK constraint written in January, listing seven types.
-- Every type added since fails the insert — and because this table is a LOG, every caller writes to
-- it fail-soft, so the failure is swallowed and the record simply does not appear.
--
-- Found 2026-08-10 while recording three owner invitations. The insert failed on
-- `email_logs_email_type_check`; `users.last_email_at` updated fine, so the trail was half-written
-- and looked plausible. The question that could not be answered all day — "was this person ever
-- actually invited?" — is exactly the question this table exists to answer, and a constraint that
-- silently drops rows is the one thing guaranteed to stop it answering.
--
-- Dropped rather than extended, deliberately. Extending it fixes today's two names and leaves the
-- trap armed for the next type somebody adds — and the failure mode is not a loud error, it is a
-- missing row nobody looks for. A log's job is to accept what happened. NOT NULL stays, so the
-- column still cannot be empty; what goes is only the pre-approved vocabulary.
--
-- Types in use at the time of writing: kira_ready, welcome_back, magic_link, subscription_confirm,
-- subscription_reminder, weekly_summary, feature_announcement (the original seven), plus
-- owner_invite and apology_account_never_worked.

ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

COMMENT ON COLUMN public.email_logs.email_type IS
  'What kind of email this was. Deliberately unconstrained: a closed enum on a log table silently '
  'drops the records it does not recognise, which is worse than an unfamiliar string.';
