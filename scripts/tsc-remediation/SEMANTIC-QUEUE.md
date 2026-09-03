# KIRA — Semantic TypeScript Remediation Queue

These errors must be resolved against the canonical identity model.
Do NOT solve them with blind user_id/organisation_id replacement.

## Canonical identity

- resolveOrganisationForPerson
- getCurrentAppUser
- string -> OrganisationContext
- organisationId missing from ScanRequest
- userId -> OrganisationContext

## Identity plan / Supabase

- GenericStringError -> MembershipRecord
- membership possibly null

## Genome

- appUser missing
- svc missing
- docExportDate missing
- userId missing

## API/type drift

- journeyType string -> "personal" | "business"
- worthTodayText
- periodLabel
- onRedeemed
- framework projection

## Swarm

- DispatchResult.taskGroupId

## Voice checks

- Supabase client typing

## Tests

- duplicate createServiceClientV2
- BetaCodeRow.organisation_id
