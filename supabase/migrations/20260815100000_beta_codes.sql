-- Beta access codes — the non-Stripe way into the same funnel.
--
-- WHY A CODE AND NOT AN EMAILED LINK. The 2026-08-10 invitation audit found 33 accounts, 21 with no
-- agent behind them, and 8 people who could never sign in at all — because what they were sent was a
-- magic link with `mailer_otp_exp = 3600`. An invitation is read when the recipient gets to it, not
-- when it is sent, so a one-hour token is a door that is shut before it is knocked on. The rule that
-- came out of it is written down: NEVER email a magic link as an invitation, send the instruction.
--
-- A code IS the instruction. It survives the email sitting unread for a week, it can be re-typed if
-- the link is mangled by a mail client, and it can be read down a phone.
--
-- WHY IT IS BOUND TO AN EMAIL AT MINT. Borrowed from MMCBuild, where beta is a role on an INVITE
-- rather than a bearer token: the identity is fixed before the code exists. That single decision is
-- what bounds the damage if a code leaks — the worst a stranger can do with one is create an account
-- at an address WE chose, which is a nuisance rather than a breach. A bearer code that let the
-- redeemer name their own address would be a free-account generator, and worse, it would let someone
-- create the account for an address they do not own.
--
-- ⚠️ NO RATE LIMITER HERE, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT. Two reasons. The codes
-- carry ~40 bits of entropy, so guessing one is not a realistic attack. And more importantly the
-- last in-memory throttle in this codebase was found to be per-serverless-instance and therefore
-- inert (see 20260810120000, where the operator's inbox showed three "deduped" alerts four minutes
-- apart) — so a limiter that looked like protection and was not would be worse than none. If
-- redemption abuse ever appears, it wants a durable table like `unanswered_alert_sends`, not a Map.

CREATE TABLE IF NOT EXISTS public.beta_codes (
  -- Stored NORMALISED: upper case, alphanumerics only. The wire format is grouped and hyphenated
  -- ("KIRA-7H2K-9QLM") because it is typed by a person reading it off a screen or a phone call, and
  -- the API normalises before it looks anything up. Case and punctuation must never be why a real
  -- tester cannot get in.
  code              text PRIMARY KEY,

  -- WHOSE code this is. The account created by redeeming it is ALWAYS this address — it is never
  -- taken from the form. See the note above.
  email             text NOT NULL,

  -- Who they are / why they were invited, for the operator reading the table months later.
  label             text,

  -- WEEKS, not hours. The whole point of a code over a link is that it outlives the moment it was
  -- sent. NOT NULL so an immortal code cannot be created by omission.
  expires_at        timestamptz NOT NULL,

  -- Single use. NULL = available. Claimed by an atomic UPDATE ... WHERE redeemed_at IS NULL, the
  -- same shape the Stripe webhook uses to claim an event id, so two simultaneous redemptions of one
  -- code cannot both succeed.
  redeemed_at       timestamptz,
  redeemed_user_id  uuid REFERENCES public.users(id) ON DELETE SET NULL,

  -- Set when an operator withdraws a code that has not been used. Kept rather than deleted so the
  -- record of who was invited survives the invitation being pulled.
  revoked_at        timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        text
);

COMMENT ON TABLE public.beta_codes IS
  'Single-use beta access codes, bound to an email at mint. Redeeming one creates a confirmed '
  'account for beta_codes.email and starts a trial with no Stripe involvement. Service-role only.';

COMMENT ON COLUMN public.beta_codes.code IS
  'Normalised: upper case, alphanumerics only. The API strips hyphens and case before lookup, so a '
  'tester typing "kira-7h2k-9qlm" from an email matches "KIRA7H2K9QLM" here.';

CREATE INDEX IF NOT EXISTS beta_codes_email_idx ON public.beta_codes (email);

-- Finding the unredeemed ones is the operator's standing question ("who have we invited who has not
-- come in yet?") and it is the query any re-invite path runs.
CREATE INDEX IF NOT EXISTS beta_codes_open_idx
  ON public.beta_codes (expires_at)
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;

-- RLS ON, WITH NO POLICY. Deliberate, and it is the whole access model: no policy means no row is
-- visible to anon or to any authenticated user, and only the service role — which bypasses RLS —
-- can read or write. A signed-in owner has no business enumerating who else was invited, and the
-- redemption endpoint runs service-side.
ALTER TABLE public.beta_codes ENABLE ROW LEVEL SECURITY;
