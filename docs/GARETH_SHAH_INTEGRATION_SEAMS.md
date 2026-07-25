# Kira Exec — architecture & integration seams

**Product:** **Kira Exec** — the owner-operator fractional-exec agent, distinct from personal Kira,
PubGuard, and the other Kira verticals.
**To:** Gareth Newman (agent swarm · memory harness · agent builder) · Shah Hussain (Mnemo)
**From:** Dennis McMahon, Corporate AI Solutions
**Re:** our shape as-built, where it lands when the memory loop is done, and the contracts to plug into
**Cross-check:** Gareth has access to both the `kira` and `cais-shared-services` repos — file paths are
cited throughout so this doc can be verified against the code, not taken on trust.
**Companion:** `docs/OWNER_OPERATOR_AI_EA_MODEL.md` (the product thesis this implements)

> **Purpose.** Lay out Kira Exec's architecture in enough detail that you both know our shape, then
> pin down the handful of **contracts** to plug into. We define a *stub* on our side (interfaces
> first, then a working stub); each of you swaps in a real adapter when ready, with (in most cases)
> no change to Kira. The voice+memory core is **already a shipped canonical** —
> `@caistech/elevenlabs-convai@0.7.0` in `cais-shared-services` — so you're integrating with a
> reusable, versioned package, not a one-off app.

---

## 1. What Kira Exec is (one paragraph)

A **voice-first AI executive assistant** for the hands-on owner-operator. It lives on the owner's
phone, captures the knowledge in their head *as they work* (Siri-style, ~100 short exchanges a day),
and drives a back-office that runs itself — with the owner **in the loop, not in the weeds**. The
end state is a business that is **learned, stored, and turned into a transferable/sellable asset**.
Kira Exec is the **voice front-end (Layer 1)**; Gareth's swarm is the **back-office that does the work
(Layer 2)**; the CAS backbone is the **system of record (Layer 3)**; and memory is **three lanes**
(§4) that the three of us each own one of.

---

## 2. Stack & repos (for cross-check)

- **App:** Next.js 16 · TypeScript · Tailwind · Supabase · Stripe · Resend. Repo: `kira` (prod: `kira-rho.vercel.app`).
- **Voice:** the canonical hub package **`@caistech/elevenlabs-convai`** (in `cais-shared-services`) + its React `VoiceWidget`. Kira never forks a voice client — it consumes the hub. Owner-gated per-user coach agents connect via **signed URL** (hub ≥0.5.0).
- **Substrate:** `@caistech/*` shared services (the moat). Catalog: `cais-shared-services/SHARED_SERVICES.md`. Data rules: `DATA_STANDARD.md`.
- **Semantic memory:** Mnemo (`api.mnemohq.com`) — wired portfolio-wide for bug-knowledge already; to be wired for Kira deep recall (§4, §Seam 2).

---

## 3. The provisioning + memory architecture as-built

**Agent provisioning (one agent per user):** `/start` → **discovery** (deep-discovery voice agent on
`@caistech/discovery-agent`, produces a **Client Profile** + a gate) → **draft** (`kira_drafts`) →
`POST /api/kira/create`. Create mints an ElevenLabs agent, attaches the 5 canonical memory tools,
binds the workspace post-call webhook, sets the origin allowlist, and pins the model to the hub
default (`gpt-4.1-mini`). *Files:* `app/api/kira/create/route.ts`, `lib/kira/discovery*.ts`,
`lib/kira/convai.ts`.

**The voice-memory loop — a 7-link chain** (each link's failure is the identical silent "no memory"
symptom; all now green + regression-tested):

1. Post-call webhook **bound at workspace scope** (`/api/kira/webhook`).
2. Post-call **HMAC verified** (`ELEVENLABS_WEBHOOK_SECRET`).
3. The 5 memory tools **attached** to the agent (`get_conversation_context`, `save_message`, `update_conversation_topic`, `recall_memory`, `save_memory`).
4. Tool-webhook **auth**: each tool carries `x-kira-tool-secret`; routes fail-closed via `toolSecretOk()`.
5. The **model** actually emits the tool call (why link 3's model pin matters — `gpt-4o-mini` drops tool calls over long calls).
6. Post-call **distil** → durable memory (`distillConversationToMemory`, OpenAI extractor) writes `kira_memory`.
7. **Recall** reads it back (`get_conversation_context` RPC + `recall_memory`).

*Tables* (`kira_agents`, `conversations`, `conversation_messages`, `kira_memory`) are mapped onto the
canonical contract in `lib/kira/convai.ts` (`KIRA_CONVAI_TABLES`). *Routes:*
`app/api/kira/webhooks/*`. **Identity is server-derived** from the agent→user binding — never
agent-supplied (closes cross-tenant read/write). The **welcome-back opener is rendered server-side**
(`lib/kira/welcome-back.ts`) and pushed as a per-session `first_message` override, so recall is
deterministic rather than depending on the model choosing to call a tool. **Session-focus rules**
(`lib/kira/session-focus.mjs`): open with what you have, hold the focus the owner declares over any
stale objective, and **select from memory rather than recite it**. A full **end-to-end behavioural
test** (`scripts/test-memory-loop.mjs`, CI `memory-loop.yml`) drives talk→disconnect→reconnect→recall
against prod.

**Owned RAG (in build):** uploaded docs/URLs move OFF the ElevenLabs vendor knowledge base INTO an
**owned store** in our Supabase (`kira_knowledge`): extract → chunk → embed → a `search_knowledge`
tool the agent calls, cited. Per `DATA_STANDARD` (authoritative prose you must cite → owned RAG, in
our infra = the moat). *This is what makes the business's documents an owned asset, not a vendor's.*

**Dual-auth portals** (user + admin, `ADMIN_EMAILS` allowlist), per the portfolio §8.5 standard.

---

## 4. The three memory lanes (who owns what)

| Lane | Holds | Owner | Where it is today |
|---|---|---|---|
| **System-of-record (structured)** | Exact, auditable facts — clients, jobs, quotes, invoices, schedules | **CAS backbone** | Checkpoint-style backend (Layer 3), seeds the generic "empty categories" |
| **Working / orchestration** | Live task state, cross-agent context, "what the swarm is doing now" | **Gareth** | **not built on our side — your lane** |
| **Experiential / semantic** | Who the owner is, how they work, prior decisions, "what we learned last time" | **Shah / Mnemo** | Kira runs **near-term** recall on our Supabase (`kira_memory`) today; **deep/cross-session** recall → Mnemo is the next wire-up |

You never ask semantic memory for an invoice total; you never trap evolving memory in a rigid table.
The boundaries between these are Seams 2 and 3.

---

## 5. Where we are, and where we'll be when the memory build finishes

**Now (done + deployed + tested):** the 7-link memory loop is fixed, deployed, and guarded by the
E2E test in CI; recall is deterministic; session-focus rules are live; identity is server-derived;
the Stripe agent-minting landmine is removed and the email sender corrected.

**Built + deployed (2026-07-25):** the memory + knowledge + identity loop works in a real voice call
(root cause: ElevenLabs never passes the conversation id to server-tool webhooks — identity is now
**server-baked per user**); **owned-RAG** docs reachable + cited (§3); **Mnemo deep recall** wired
(the experiential lane, §4); the deterministic welcome-back opener + session-focus persona rules.
**In build:** the fractional-exec persona + the thin owned doing-slice (see Seam 1), discovery-gated
agent creation (converges with your agent builder, Seam 4).

**The canonical is DONE, not pending.** The voice+memory core — server-baked identity,
tool-webhook auth, deterministic recall, the post-call distil loop, plus a reusable CI guard
(`probeMemoryLoop`) — is **published as `@caistech/elevenlabs-convai@0.7.0`** in
`cais-shared-services`, the reference implementation every product consumes. **So you are plugging
into a shipped canonical package, not the Kira app** — the seams below live at that package boundary,
which is why they're defined as interfaces.

---

## Seam 1 — intent → task dispatch (Kira → Gareth's coordinator)

Kira extracts an intent from a ~20-second exchange and hands it to the coordinator, which decomposes
it into dispatched back-office tasks.

**Important reframe (from our product definition, 2026-07-25): your swarm is the EXPANSION of doing,
not the gate for it.** The first "it got done" moment — draft→approve→send a quote, a follow-up
email, a reminder that fires — is a thin, single-step, human-approved action Kira does **herself,
now**, with no swarm. So Kira dispatches EVERY doable intent through the `SwarmCoordinator` interface
below; our stub handles those ~3 owned tasks locally today, and **your adapter expands `dispatchIntent`
from ~3 tasks to the whole back-office (CRM, scheduling, dispatch, quoting, invoicing, compliance)
behind the exact same contract** — no change on our side. This means neither of us is blocked on the
other: Kira ships the wedge on the owned tasks; your swarm turns it into a business that runs itself.

**Strawman to react to:**
```ts
dispatchIntent(intent: {
  tenantId: string     // the ONE canonical business+owner key (§Cross-cutting)
  intentId: string     // our idempotency key — one utterance never dispatches twice
  utterance: string    // raw transcript
  classified?: {...}    // OPTIONAL structured NLU if you'd rather we classify
  context: {...}        // relevant recent memory Kira already holds
}) => { taskGroupId: string, status: 'queued' }
// results return async via a webhook you POST to us, keyed by taskGroupId
```

1. **Input** — structured intent or raw text? If structured, who owns the taxonomy — Kira or the coordinator?
2. **Transport** — HTTP, message queue, or an MCP tool? (MCP fits our portfolio; a queue fits fire-and-forget.)
3. **Return channel** — how does task state come back so Kira can say "job scheduled, quote drafted for approval"? Webhook to us / poll / subscription?
4. **Human-in-the-loop** — nothing leaves the building without approval. Does the swarm **pause** and emit `awaiting_approval` we surface, then we post back approve/reject + the artifact id?
5. **Idempotency** — you honour our `intentId` to dedupe a retry?
6. **Degradation** — swarm down → Kira still captures + queues (the owner never waits). Queue/replay contract?

## Seam 2 — working ↔ semantic memory (Gareth ↔ Shah, with Kira)

**This boundary is between the two of you** — decide #7–#11 directly; we build to whatever you set.

7. **Write ownership to Mnemo** — who distils-and-writes: swarm, Kira, or a shared distiller? (One writer per path or memories double/conflict.)
8. **Read from Mnemo** — does the swarm read Mnemo to prime itself, or only Kira?
9. **PII boundary** — working memory may hold PII (transient, in-infra); Mnemo holds only distilled, non-PII conclusions. **Who enforces the distillation?** (Hard compliance line.)
10. **Scope key** — Gareth's working-memory scope, the Mnemo scope, and our `tenantId` must be the **same** key. Shah: Mnemo scope-id format + isolation guarantee? Gareth: same keying?
11. **Lifetime** — is working-memory state ephemeral (dies with the task) or durable enough that Kira can ask "what's the swarm doing right now" after a reconnect?

**For Shah (Kira ↔ Mnemo):** we need the `add`/`search` contract, scope-id format, latency +
availability envelope, and where the line sits between Kira's Supabase near-term recall and Mnemo deep
recall — do we migrate experiential memory to Mnemo, or dual-write?

## Seam 3 — swarm ↔ CAS backbone (system of record)

12. **Write path** — swarm writes structured facts **directly** to our tables, or through an API we expose? (An API gives us the approval gate + audit.)
13. **Schema ownership** — we define the generic "empty categories" (CRM/jobs/finance/HR/compliance) once; the swarm writes into our shapes. Confirm — it's the "one backbone, many businesses" leverage.
14. **Authoritative-write approval** — a swarm write needing sign-off lands `proposed`, promoted to `authoritative` on the owner's approve (ties Seam 1's HITL to the data). Agree?

## Seam 4 — the agent builder (Gareth's builder ↔ CAS discovery)

Your swarm ships a **roster of templated agents** plus an **agent builder** that spins up agents
**beyond** the template for a use case the roster doesn't cover. This converges with our
**discovery/office-hours gate**: before any agent is spun up, we define what it's for, the use case,
and how it's tuned for that business's users. **That discovery output is plausibly the exact spec your
builder consumes** — two halves of one mechanism.

15. **The roster** — what templated agents ship out of the box? (Model assumed CRM · scheduling/dispatch · quoting · invoicing · compliance — confirm the real list.)
16. **Builder input** — what spec creates a *new* agent (role, tools, guardrails, prompts)? Could it consume the spec our discovery produces, and in what shape?
17. **Trigger** — operator UI, **Kira via voice** ("I need an agent that does X"), or programmatic?
18. **Join semantics** — does a built agent auto-join the swarm under the coordinator, or run standalone?
19. **Capability + guardrails** — what can a built agent DO, and how are dangerous capabilities bounded (invoice-firing needs a hard approval gate)?
20. **Scope** — per-business / per-user / per-repo? Must align with `tenantId`.
21. **Memory inheritance** — does a built agent auto-get the three-lane model, or is it wired per agent?
22. **Lifecycle** — update / version / deprecate; who owns the definition of record?

## Cross-cutting (answer once)

23. **Tenancy key** — one canonical `tenantId` across tasks, memory, records. Propose its shape; cross-tenant leakage is the failure we most want designed out.
24. **Auth between systems** — shared secret / signed tokens / mTLS? These seams carry live business data.
25. **Observability** — a correlation id tracing one voice exchange → N tasks → completions across every hop.
26. **Versioning** — a version field on every seam payload so one party's change can't silently break another.
27. **Metering** — swarm value = analysis/decision (metered); mechanical work = plain API calls. How do we meter swarm + Mnemo usage for per-active-user economics?

---

## What CAS ships regardless (nobody is blocked)

Our side as **TypeScript interfaces + a working stub** (interfaces first, stub in progress) —
`SwarmCoordinator` (whose stub already runs the ~3 owned doing-tasks — see Seam 1), `MemoryGovernance`,
`SystemOfRecord`, `AgentBuilder` — the stub accepts a dispatched intent, returns a fake `taskGroupId`
+ `queued`, and exposes a task-state read. Kira builds against the **interface** now; each of you later
ships an adapter implementing the same interface and we swap the stub out. These interfaces are
designed to live at the `@caistech/elevenlabs-convai` canonical boundary (§5).

## What we need back

- **Gareth:** Seams 1, 3, 4 + your read on Seam 2 and the cross-cutting five.
- **Shah:** the Mnemo `add`/`search` contract, scope-id format + isolation, latency/availability, and your read on Seam 2 (esp. #7 write-ownership, #9 PII distillation).
- **Between you two:** agree #7–#11 — that boundary is yours to draw.

Once we have your shapes, the stub becomes the real adapter with, in most cases, no change to Kira.
