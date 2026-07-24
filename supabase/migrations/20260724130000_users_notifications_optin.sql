-- Settings › Notifications (PRODUCT_STANDARDS §4): give the app-user record an email-notifications
-- opt-in so the /settings Notifications section has a real persisted toggle. Idempotent.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email_notifications_opt_in BOOLEAN NOT NULL DEFAULT TRUE;
