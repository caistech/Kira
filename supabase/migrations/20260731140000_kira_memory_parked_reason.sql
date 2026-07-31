-- Why a memory left the Genome.
--
-- One Kira account is one BUSINESS, and this one is Factory2Key: the tenant identity on every email
-- it sends is The Trustee for Factory2Key Unit Trust, ABN 51700805298. The memory corpus, though,
-- had accumulated across demos and carried a second entity's work — Global Buildtech Australia,
-- trading as Corporate AI Solutions — sitting in the same Genome.
--
-- That is not untidiness. The Genome is a handover document for a buyer, so a fact filed there is a
-- claim about THAT business. And the register rewrite makes it worse rather than better: turning
-- "Dennis is raising money for the Long Tail AI Fund" into "Money is being raised for the Long Tail
-- AI Fund" removes the one token that made the misfiling visible, and what remains reads as
-- Factory2Key's fundraising.
--
-- So rows belonging to the other entity are DEACTIVATED, not deleted, and this column records why.
-- `active = false` alone cannot distinguish "parked because it belongs to another business" from
-- any other deactivation, and without that distinction the decision is unreviewable and the parking
-- is not reversible in any meaningful sense — you would be guessing which rows to bring back.
--
-- Idempotent.

ALTER TABLE public.kira_memory
  ADD COLUMN IF NOT EXISTS parked_reason text;

COMMENT ON COLUMN public.kira_memory.parked_reason IS
  'Why this memory was deactivated, when it was not the owner''s own doing. e.g. entity:ai_business — belongs to a different business than this account. NULL = not parked by us.';
