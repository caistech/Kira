# Kira — Semantic Disposition Register

**Status:** Finalisation Required
**Purpose:** Map every legacy structure to a canonical disposition (RETAIN / MIGRATE / TRANSFORM / MERGE / REPLACE / ARCHIVE / RETIRE / DISCARD).

| Legacy Structure | Current Role / Semantic Responsibility | Target Disposition | Rationale / Architectural Implication |
| :--- | :--- | :--- | :--- |
| `users.id` (as Org Key) | Tenant isolation key | **RETIRE** | Replace with `organisations.id` (new). |
| `users.id` (as Person Key) | Person identity | **RETIRE** | Replace with `persons.id` (new). |
| `users` (table) | Conflated Person/Org/Auth | **TRANSFORM → RETIRE** | Split into `persons`, `organisations`, `auth_credentials`. |
| `users.subscription_status` | Subscription status | **RETIRE** | Move data to new `subscriptions` table. |
| `users.stripe_*` | Stripe integration | **RETIRE** | Move data to new `subscriptions` table. |
| `business_identity` (table) | 1:1 Org membership | **TRANSFORM → RETIRE** | Decomposed into `organisation_memberships` and `ownership_periods`. |
| `business_identity.owner_name` | Current owner | **RETIRE** | Move data to `ownership_periods` (temporal). |
| `kira_agents` (table) | Instance lifecycle | **TRANSFORM** | Rebind `user_id` FK to `organisation_id`. |
| `kira_tasks` (table) | Action management | **TRANSFORM** | Rebind `user_id` FK to `organisation_id`; link to `decisions`. |
| `kira_tasks.result` | Task outcome | **TRANSFORM → RETIRE** | Decomposed into new `outcomes` table linked to `decisions`. |
| `kira_memory` (decision) | Decision representation | **TRANSFORM → RETIRE** | Extract to new `decisions` table. |
| `kira_memory` (non-decision) | Contextual evidence | **TRANSFORM → RETIRE** | Migrate to `evidence_records`. |
| `genome_entities` | Business assertions | **TRANSFORM** | FK restructure from `user_id` to `organisation_id`. |
| `genome_facts` | Business assertions | **TRANSFORM** | FK restructure from `user_id` to `organisation_id`. |
| `genome_relationships` | Business assertions | **TRANSFORM** | FK restructure from `user_id` to `organisation_id`. |
| `genome_events` | Causal events | **TRANSFORM** | FK restructure from `user_id` to `organisation_id`. |
| `kira_knowledge` | Knowledge extraction | **TRANSFORM → RETIRE** | Migrate to `evidence_records` / `organisational_knowledge`. |
| `conversations` | Evidence source | **TRANSFORM** | FK restructure from `user_id` to `organisation_id`. |
| `introducers` | Referral attribution | **VERIFY / TRANSFORM** | Check `user_id` rebind to `persons`/`organisations`. |
| `introductions` | Referral attribution | **VERIFY / TRANSFORM** | Check `user_id` rebind to `persons`/`organisations`. |
| `admin_users` | Admin role | **MERGE → RETIRE** | Merge into `organisation_memberships` (role: 'admin'). |
| `audit_log` | Operational audit | **RETAIN / TRANSFORM** | Retain responsibility, transform (add `organisation_id`). |
| `subscription_history` | Historical audit | **TRANSFORM → RETIRE** | Migrate to temporal `subscriptions` table. |

---

## Disposition Tally

### Semantic Responsibility
| Responsibility | Count |
| :--- | :--- |
| **RETAIN** | 10 |
| **DECOMPOSE** | 7 |
| **RETIRE** | 5 |
| **Total** | 22 |

### Physical Disposition
| Physical Disposition | Count |
| :--- | :--- |
| **TRANSFORM** | 12 |
| **TRANSFORM → RETIRE** | 7 |
| **RETIRE** | 5 |
| **MERGE → RETIRE** | 1 |
| **VERIFY / TRANSFORM** | 2 |
| **RETAIN / TRANSFORM** | 1 |
| **Total** | 28 |
