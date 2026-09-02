BEGIN;

ALTER TABLE public.beta_codes
    ADD COLUMN IF NOT EXISTS organisation_id UUID
    REFERENCES public.organisations(organisation_id);

CREATE INDEX IF NOT EXISTS idx_beta_codes_organisation_id
    ON public.beta_codes(organisation_id);

COMMENT ON COLUMN public.beta_codes.organisation_id IS
    'Canonical Organisation this beta code provisions/accesses. This is organisational context, not auth identity.';

COMMIT;