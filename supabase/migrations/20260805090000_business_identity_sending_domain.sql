-- The domain the owner's mail is SENT FROM — asked for, never derived.
--
-- WHY IT CANNOT BE DERIVED FROM reply_email. The obvious shortcut is to take the domain off the
-- address he already gave. That works only for owners who already run their own mail, which in this
-- ICP is the minority: a tradesman replies from bobsplumbing@bigpond.com, and deriving from it
-- yields `bigpond.com` — a domain he does not control and can never verify, because Telstra owns it.
-- The setup would then hand him DNS records that are impossible to publish and dead-end with no
-- explanation of why.
--
-- His WEBSITE domain is the separable, correct answer, and the two are frequently different. The
-- reply address stays wherever he actually reads mail; only the sending domain has to be his.
--
-- NULLABLE ON PURPOSE. Plenty of owners have no website at all, and that is a supported state, not
-- an incomplete record: their mail goes out on the portfolio's verified domain carrying their name,
-- their reply address and their ABN. Requiring this would block exactly the least technical owners.
--
-- `sending_domain_verified_at` is what the orchestrator's from_email must key off. The contract in
-- orchestrator/src/contract.ts already says from_email is set ONLY after Resend reports the domain
-- verified — an unverified domain is rejected at send time. That rule was written down and then
-- broken by hand: updates.factory2key.com.au had DNS published, was never added to Resend, and
-- from_email was set anyway. Every send 403'd, after the agent had already said it was sent.
-- Recording the verification as a timestamp makes the precondition a column rather than a habit.

alter table public.business_identity
  add column if not exists sending_domain text,
  add column if not exists sending_domain_verified_at timestamptz;

comment on column public.business_identity.sending_domain is
  'The owner''s own website domain, e.g. bobsplumbing.com.au. Mail is sent from a subdomain of it once verified. NULL is valid and means "send on the portfolio domain with this owner''s identity".';

comment on column public.business_identity.sending_domain_verified_at is
  'Set only when Resend reports the domain verified. Until then the sender MUST fall back — an unverified domain is rejected at send time.';
