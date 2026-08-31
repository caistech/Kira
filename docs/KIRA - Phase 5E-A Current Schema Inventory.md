# Kira Memory Schema — Current Inventory (Phase 5E-A)

This document provides a forensic inventory of the `kira_memory` table and its dependencies as of the start of Phase 5E.

## 1. Table: `kira_memory`

### 1.1 Columns (Forensic Definition)

| Column | Type | Nullable | Default | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | No | `gen_random_uuid()` | Primary Key |
| `user_id` | UUID | No | - | FK to `users(id)`, ON DELETE CASCADE. **Critical Defect (INV-020)**. |
| `kira_agent_id` | UUID | No | - | FK to `kira_agents(id)`, ON DELETE CASCADE. |
| `memory_type` | TEXT | No | - | CHECK (`preference`, `context`, `goal`, `decision`, `followup`, `correction`, `insight`). |
| `content` | TEXT | No | - | |
| `source_conversation_id` | UUID | Yes | - | FK to `conversations(id)`, ON DELETE SET NULL. |
| `importance` | INT | Yes | 5 | CHECK (1-10). |
| `tags` | TEXT[] | Yes | '{}' | |
| `active` | BOOLEAN | Yes | true | Soft-delete flag. |
| `superseded_by` | UUID | Yes | - | Self-referencing FK. |
| `recall_count` | INT | Yes | 0 | |
| `last_recalled_at` | TIMESTAMPTZ | Yes | - | |
| `created_at` | TIMESTAMPTZ | Yes | NOW() | |
| `updated_at` | TIMESTAMPTZ | Yes | NOW() | |
| `genome_headline` | TEXT | Yes | - | Added: `20260731160000` |
| `parked_reason` | TEXT | Yes | - | Added: `20260731140000` |
| `genome_about` | TEXT | Yes | - | Added: `20260802050000` |
| `genome_private_reason` | TEXT | Yes | - | Added: `20260802050000` |
| `genome_privacy_classified_at`| TIMESTAMPTZ | Yes | - | Added: `20260802050000` |

### 1.2 Indexes
- `idx_kira_memory_user` (`user_id`)
- `idx_kira_memory_agent` (`kira_agent_id`)
- `idx_kira_memory_type` (`memory_type`) WHERE `active = true`
- `idx_kira_memory_importance` (`importance` DESC) WHERE `active = true`
- `idx_kira_memory_tags` (GIN `tags`) WHERE `active = true`
- `idx_kira_memory_privacy_unclassified` (`user_id`) WHERE `genome_privacy_classified_at IS NULL`

### 1.3 Constraints / Policies
- **RLS:** Enabled. Policy: `FOR ALL USING (user_id = auth.uid())` + `Service role full access`.

---

## 2. Related Structures & Logic (Forensic)

### 2.1 Dependencies
- **`users`**: Table defining `user_id` ownership anchor.
- **`kira_agents`**: Table defining `kira_agent_id` context.
- **`conversations`**: Table defining `source_conversation_id` provenance.

### 2.2 Critical Implementation Divergences (Phase 5D vs Reality)
1. **`parked_reason` semantics:** Conflates system deactivation (e.g., entity mismatch) with confirmation state (e.g., `'confirmed'`).
2. **Genome data:** Scattered across `genome_headline`, `genome_about`, `genome_private_reason` within `kira_memory` rather than a separate table.
3. **Owner identity:** The schema is strictly `user_id`-scoped for all RLS policies and foreign keys.

---

## 3. Reporting Standards
- **Inventory Basis:** 20260119000000_kira_complete.sql + migration history in `Kira/supabase/migrations/`.
- **Status:** Verified (Code path inspection + SQL schema analysis).
