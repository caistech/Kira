# Consultant Genome Extraction Seam (Stage B)

## Overview

When a consultant lands on `/talk`, the journey bootstrap provisions a Kira agent with `journey_type = 'consultant'`. The `/talk` conversation captures the consultant's identity, methodology, frameworks, target clients, services, and engagement model — collectively their **consultant genome**.

## Pipeline

```
consultant enters /talk
  → kira_agents row created (journey_type = 'consultant')
  → /talk conversation runs
  → genome extraction (manual or automated pass)
  → rows land in:
      consultant_frameworks   (methodology, principles, stages, diagnostics)
      consultant_genomes      (identity, target clients, services, engagement models)
```

## Capture script

`scripts/capture-consultant-genomes.mjs` walks the fleet's consultant-journey agents and ensures each has a framework row and a genome row in the Stage-A tables. It is idempotent — re-running does not duplicate.

## Schema dependencies (Stage A — `20260921000000_chain_of_truth_hierarchy.sql`)

| Table | Purpose |
|---|---|
| `consultant_frameworks` | Versioned methodology capture (principles, stages, terminology, diagnostics, outputs, kira integration) |
| `consultant_genomes` | Structured extraction from a consultant `/talk` interview (identity, target client, services, engagement models, areas Kira can assist) |

## Output contract

A completed consultant onboarding produces:

- **consultant_frameworks row** — at minimum `framework_name`, `framework_slug`, `organisation_id`, `status = 'draft'` or `'active'`
- **consultant_genomes row** — at minimum `organisation_id`, `framework_id`, `identity` (JSONB), `target_client` (JSONB), `services` (JSONB), `completeness` (0–1)

## Data ownership

All rows belong to the consultant's own `organisation_id`. They must never land in the distributor's or client's organisation.
