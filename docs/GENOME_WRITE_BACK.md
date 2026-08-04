# Genome write-back — getting the manual out of us and into his business

> **Status:** design, agreed 2026-08-05. Companion doc in the orchestrator:
> `docs/SYSTEM_OF_RECORD_PORT.md`, which owns the credentials and the destination.
> Kira's half is *what to write, when, and with what redaction*.

## The reason this is the most important thing on the list

Kira is sold as a **project that finishes** (memory: `project-kira-is-a-project-not-a-subscription`).
Her extraction job is to make herself redundant. That only means something if the knowledge ends up
somewhere the business keeps — otherwise the migration runs from his head into *our* database, which
is a worse place for him than his head, because he cannot get it out without us.

Today there is no write path. `search_drive` and `read_document` read; `keep_document` files into
ElevenLabs' knowledge base, for Kira's benefit. So the product currently does half of what it says.

## The division

**Kira decides WHAT and WHEN. The orchestrator decides WHERE.**

Kira never learns whether the destination is Drive, OneDrive, a push API or a zip file. That is not
tidiness — it is the anti-lock-in guarantee. A caller with no opinion about the vendor cannot be
locked to one, and swapping is a change on one side of an HTTP boundary rather than a refactor.

Same seam as the existing lookup path, for the same reason.

## What gets written

**One document per area, plus an index.** The nine areas are the unit because they are the unit the
owner is measured against and the unit a buyer's advisor asks in.

HTML, converted by the destination. Not markdown (Drive will not convert it) and not PDF (he cannot
edit it, and a manual he cannot edit stops being current the day it is written).

## The risk, and it is not technical

**Two renderings. Two destinations. Never one folder.**

The owner's manual carries his position, his plans, what he would accept. The buyer handover
deliberately does not — that is `lib/genome/private.ts`, including the `how-he-works` reason added on
2026-08-04 after the handover was found carrying his approval habits and his stated priorities.

A single folder that syncs everything and is later shared with an advisor is **K1 at filesystem
scale**: one click, irreversible, and he would never know it happened. So:

- **Owner's manual** — syncs continuously, private container.
- **Buyer handover** — a **separate, explicit export** into a **separate** container, with the
  redaction shown before it is written. Never automatic, never the same folder.

If only one of the two ships, ship the owner's manual. The handover is the one that can hurt him.

## Idempotency is where this normally goes wrong

`drive_documents`: `(user_id, area_key) → ref`, plus `updated_at` and the destination kind.

An update must be an **update**. Without the mapping, the third session leaves twenty-seven documents
and he stops trusting the folder — and a manual he does not trust is worth less than no manual,
because he will not hand it to anyone.

This is the same class as the `setAgentTools` replace-vs-merge trap that cost the fleet its tools
twice. Assume it will be got wrong once; make it a table rather than a convention.

## Honesty in the tool contract

Reuse the established rule: `ok:false` means **the write did not happen — say the reason verbatim**.
Never "I've filed that" on a failure. The tool-honesty section exists because she has already
narrated a search that never ran.

**Approval-gated on first use.** Writing into a customer's own Drive is a trust threshold, not a
feature. Treat the first write like the send path: he approves, and he can see afterwards what
landed and where.

## What it unlocks

The fill metric stops being a self-assessment and becomes **a document that exists or does not**.
That matters commercially: the price step-down at the transition is triggered by the areas being
filled, and a percentage we compute about ourselves is not a defensible basis for changing what
someone pays.

⚠️ **That still needs B4** (deactivation — she proposes, he confirms, both recorded). Without a
denominator every percentage after it is indefensible. B4 is commercially load-bearing, not a rubric
nicety.

## Build order

1. `lib/genome/render.ts` — area → HTML, reusing the existing owner/buyer split.
2. `drive_documents` migration (Kira's DB — `kmrskyewwnwettlycpfe`, state it in the migration).
3. `POST /api/kira/file-manual` → the orchestrator's record endpoint.
4. `file_manual` tool, approval-gated, added to `lib/kira/tool-manifest.mjs` — **the one list**, so
   the prompt cannot describe it without it being attached.
5. Buyer export as a separate explicit action, from `/my-genome`.

## Cross-repo checklist

- Tool added to the manifest → `tool-parity.test.ts` keeps both provisioning paths in step.
- Deploy Kira **before** reprovisioning: tool URLs point at prod.
- Order is deploy → reprovision → patch. `--tools-only` skips the prompt.
- The orchestrator's `readonly` default must become `picked` before a second owner connects, or every
  later owner owes a re-consent trip. See the companion doc.

## Verified, not assumed (2026-08-05)

- Refresh works on an expired token — probed end to end through production Kira; 8 real files
  returned and `expires_at` moved forward. The write-back will not fail on expiry.
- The only connected owner is on `full` scope, so write is already permitted for him.
- `tenant_id` IS the Kira app user id, confirmed in full.
