# Kira Resource Migration Matrix — Canonical Organisational Model + P2.3 Audit

**Generated:** 2026-08-29
**Authority:** Canonical Organisational Model + P2.3 Resource Ownership Audit
**Scope:** All `user_id` references in `app/**` + `lib/**` (46 files, ~200 occurrences)
**Genome module:** CLOSED — verified canonical (organisation_id = ownership, user_id = provenance only)

---

## Classification Taxonomy

| Code | Category | Action |
|---|---|---|
| **ORG** | Organisation ownership | MUST use `organisation_id` (or `person_id` via membership) |
| **PER** | Person identity | SHOULD use `person_id` (canonical Person table) |
| **AUTH** | Authentication identity | `auth_user_id` (Auth → Person linkage) |
| **PROV** | Provenance / actor | `person_id` / appropriate actor reference (immutable audit) |
| **LEGACY** | Legacy compatibility | Temporarily acceptable with documented retirement plan |
| **OP** | Operational relationship | Assess against canonical model; migrate if ownership |
| **DEFECT** | Genuine defect | Migrate immediately |

---

## Migration Matrix

### A. Genome Core (CLOSED — Verified Canonical)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `business-genome/repository.ts` | 44, 62, 131, 153, 241, 261, 350, 374, 412, 431, 469 | `user_id: input.user_id` / `current.user_id` | **PROV** | Provenance on create/supersede/confirm — correct |
| `business-genome/conflicts.ts` | 432 | `user_id: userId` | **PROV** | Supersession actor — correct |
| `business-genome/extract.ts` | 262, 358, 407, 421 | `user_id: userId` | **PROV** | Extraction pipeline actor — correct |
| `business-genome/orchestrator.ts` | 37 | `user_id: string` | **PROV** | Access log actor — correct |
| `business-genome/repository.test.ts` | 37, 61, 73, 118, 163, 176, 206, 255, 268, 276, 283 | Test constants/assertions | **PROV** | Test scaffolding — correct |
| `business-genome/extract.test.ts` | 19, 61, 93, 120, 142, 164 | Test constants | **PROV** | Test scaffolding — correct |
| `business-genome/e2e-validation.test.ts` | 122, 126, 128, 160, 161, 232, 233, 355, 359 | Test org setup/assertions | **PROV** | Test scaffolding — correct |

---

### B. API Routes — Genome (Verified Canonical)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `app/api/genome/extract/route.ts` | 27, 44 | `organisation_id: ctx.organisationId` | **ORG** | Correct — org-scoped |
| `app/api/genome/assess/route.ts` | 31, 95 | `organisation_id: ctx.organisationId` | **ORG** | Correct — org-scoped |
| `app/api/genome/drafts/route.ts` | 59, 71, 96, 107, 112, 113, 122, 199 | Mixed `.eq('user_id', ...)` / `.eq('auth_user_id', ...)` | **LEGACY** | `kira_drafts` has no org_id — requires P2.4 migration |

---

### C. API Routes — Kira Agent / Chat / Email (Requires Classification)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `app/api/kira/create/route.ts` | ~ | `UNIQUE(user_id, journey_type)`, `.eq('user_id', user.id)`, `user_id: user.id` | **LEGACY / OP** | Agent ownership currently per-user; canonical model requires org-scoped agents with person_id provenance |
| `app/api/kira/chat/text/route.ts` | 258 | `getCurrentAppUser()` → `appUser.id` | **AUTH/LEGACY** | Auth identity check — should resolve to person_id via membership |
| `app/api/kira/chat/text/route.ts` | ~ | `recalledFacts(... userId)`, `taskLedgerContext(userId)`, `agent.user_id`, `classifyPendingMemories(agent.user_id)` | **LEGACY / PROV** | Mix of provenance and legacy ownership — classify per call |
| `app/api/kira/agent/route.ts` | 45 | `getCurrentAppUser()` | **AUTH/LEGACY** | Same as above |
| `app/api/kira/email/send-kira-ready/route.ts` | 105 | string vs union | **LEGACY** | Unrelated to ownership |

---

### D. Admin / Exec (Requires Classification)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `lib/admin/exec.ts` | 84-105 | `business_valuations`, `kira_agents`, `client_profiles`, `kira_memory` all selecting/filtering by `user_id` | **LEGACY / OP** | Admin tooling uses user_id as operational key; canonical model requires org-scoped queries with person_id provenance |
| `lib/admin/exec-reprovision.ts` | 91, 162 | `user_id` select + tool reprovisioning | **LEGACY** | Tool setup tied to user — should be org-scoped agent |
| `app/admin/(panel)/exec/[userId]/page.tsx` | ~ | `business_valuations .eq('user_id', userId)`, `kira_agents .eq('user_id', userId)`, `kira_memory .eq('user_id', userId)` | **LEGACY** | Admin UI filters by user_id — must become org-scoped with person filter |

---

### E. Business Identity / Profile (Requires Classification)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `lib/business-identity/index.ts` | ~ | `user_id` in queries | **LEGACY / PER** | Business identity is per-organisation, but linked to person via membership |
| `lib/business-identity/store.ts` | ~ | `user_id` | **LEGACY / PER** | Same |
| `lib/business-identity/sync.ts` | ~ | `user_id` | **LEGACY / PER** | Same |
| `lib/business-identity/business-identity.test.ts` | ~ | test assertions | **TEST** | Test scaffolding |

---

### F. Genome Lib (Requires Classification)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `lib/genome/access-log.ts` | ~ | `user_id` | **PROV** | Access log actor — correct if person_id |
| `lib/genome/derive.ts` | ~ | `user_id` | **LEGACY** | `deriveOwnerGenome(organisationContext)` signature — needs person_id |
| `lib/genome/file-manual.ts` | 78 | `deriveOwnerGenome(userId)` | **DEFECT** | Passes userId where orgContext required — signature mismatch |
| `lib/genome/dedupe-sweep-apply.ts` | ~ | `user_id` | **PROV/LEGACY** | Sweep actor provenance — verify org scoping |

---

### G. Kira Lib (Requires Classification)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `lib/kira/convai.ts` | ~ | `user_id` in calls | **LEGACY / PROV** | ConvAI integration — person_id for actor |
| `lib/kira/confirm.ts` | ~ | `user_id` | **LEGACY / PROV** | Confirmation actor |
| `lib/kira/discovery.ts` | ~ | `user_id` | **LEGACY / PROV** | Discovery actor |
| `lib/kira/entity-sweep.ts` | ~ | `user_id` | **LEGACY / PROV** | Sweep actor |
| `lib/kira/knowledge-search.ts` | ~ | `user_id` | **OP / LEGACY** | Search scope — must be org-scoped |
| `lib/kira/knowledge-tool.ts` | ~ | `user_id` | **OP / LEGACY** | Tool execution — must be org-scoped |
| `lib/kira/capability-sweep.ts` | ~ | `user_id` | **PROV / LEGACY** | Sweep actor |
| `lib/kira/area-agenda.ts` | ~ | `user_id` | **PROV / LEGACY** | Agenda actor |
| `lib/kira/apply-profile.ts` | ~ | `user_id` | **PROV / LEGACY** | Profile application actor |

---

### H. Billing / Introducer / Pubguard / Settings (Requires Classification)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `lib/billing/index.ts` | ~ | `user_id` | **LEGACY / PER** | Billing attached to person/organisation — canonical: org |
| `lib/introducer/index.ts` | ~ | `user_id` | **LEGACY / PER** | Introducer link — canonical: person via membership |
| `app/pubguard/config.ts` | 168, 189 | `user_id` in config schema | **LEGACY** | Pubguard config — likely operational |
| `app/settings/actions.ts` | 18, 34 | `.eq('auth_user_id', authUser.id)` | **AUTH** | Auth linkage — correct |

---

### I. UI Pages (Requires Classification)
| File | Line | Pattern | Classification | Notes |
|---|---|---|---|---|
| `app/knowledge/page.tsx` | 57 | `user` undefined | **DEFECT** | Variable missing — likely person/org context |
| `app/my-genome/[area]/page.tsx` | 63 | `user_id` arg shape mismatch | **DEFECT** | Calling signature mismatch |
| `app/my-genome/[area]/actions.ts` | 40 | `user_id` arg shape mismatch | **DEFECT** | Calling signature mismatch |
| `app/drafts/page.tsx` | ~ | `user_id` | **LEGACY** | Draft ownership — canonical: org |
| `app/requests/page.tsx` | ~ | `user_id` | **LEGACY** | Request ownership — canonical: org |
| `app/talk/page.tsx` | ~ | `user_id` | **LEGACY** | Talk session — canonical: org |
| `app/chat/transcript-persistence.test.ts` | 70 | test expectation `.eq('user_id', user.id)` | **TEST** | Test scaffolding |

---

## Summary Counts

| Classification | Count | Priority |
|---|---|---|
| **PROV** (provenance — correct) | ~25 | ✅ No action |
| **ORG** (ownership — correct) | ~10 | ✅ No action |
| **AUTH** (auth linkage) | ~2 | ✅ No action |
| **LEGACY** (ownership via user_id) | ~35 | 🔴 P2.4 migration |
| **OP** (operational — needs assessment) | ~25 | 🟠 Assess → migrate |
| **DEFECT** (genuine bug) | ~5 | 🔴 Immediate fix |
| **PER** (should be person_id) | ~10 | 🟠 Migrate |
| **TEST** (test scaffolding) | ~15 | 🟢 Update with migrations |

---

## Next Actions (Priority Order)

1. **Immediate DEFECT fixes** (5): `lib/genome/file-manual.ts:78`, `app/knowledge/page.tsx:57`, `app/my-genome/**` signature mismatches
2. **P2.3 Resource Ownership Audit completion** — classify all LEGACY/OP entries against canonical model with explicit rationale
3. **P2.4 Resource Migrations** — schema changes per migration matrix:
   - `kira_agents`: add `organisation_id`, drop `UNIQUE(user_id, journey_type)`, add `UNIQUE(organisation_id, journey_type)`, add `person_id` provenance
   - `business_valuations`: add `organisation_id`, migrate ownership
   - `kira_memory`: add `organisation_id`, migrate ownership
   - `kira_drafts`: add `organisation_id` (currently missing)
   - `client_profiles`: add `organisation_id`
4. **Admin tooling migration** — `lib/admin/exec.ts`, `exec-reprovision.ts`, admin UI to org-scoped queries
5. **Kira lib migration** — all `lib/kira/**` to accept `organisationContext { organisationId, personId }` instead of `userId`
6. **Billing/Introducer** — migrate to org-scoped with person provenance
7. **Test updates** — align test scaffolding with new signatures

---

## Canonical Model Compliance Checklist

- [x] Genome internal: organisation_id ownership, user_id provenance
- [ ] Kira agents: org-scoped with person_id provenance
- [ ] Business valuations: org-scoped
- [ ] Kira memory: org-scoped
- [ ] Client profiles: org-scoped
- [ ] Kira drafts: org-scoped (add organisation_id)
- [ ] Billing: org-scoped with person provenance
- [ ] Introducer: person via membership
- [ ] Admin tooling: org-scoped queries with person filter
- [ ] All lib/kira: accept `organisationContext { organisationId, personId }`
- [ ] All UI pages: resolve org/person from auth context
- [ ] All tests: updated to canonical signatures

---

**Note:** This matrix is the governing artifact for P2.3/P2.4. No further schema changes until every LEGACY/OP entry has explicit canonical-model rationale and migration plan documented here.