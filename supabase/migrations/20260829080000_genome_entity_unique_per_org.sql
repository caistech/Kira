-- Phase 1D: rebind genome_entities unique constraint from user scope to organisation scope.
--
-- The canonical knowledge model made organisation_id the ownership/scope key.
-- The legacy constraint genome_entities_unique_per_user (user_id, entity_type, name)
-- enforces uniqueness per provenance identity rather than per owner — so a person
-- managing two businesses cannot record the same entity name (e.g. "Xero", "John")
-- in both. Rebind to per-organisation uniqueness.
--
-- NOTE: genome_facts / genome_relationships have no unique constraints — supersession
-- chains intentionally allow multiple rows for the same subject/predicate, so only
-- genome_entities needs remediation here.

ALTER TABLE genome_entities DROP CONSTRAINT IF EXISTS genome_entities_unique_per_user;

ALTER TABLE genome_entities
  ADD CONSTRAINT genome_entities_unique_per_org UNIQUE (organisation_id, entity_type, name);