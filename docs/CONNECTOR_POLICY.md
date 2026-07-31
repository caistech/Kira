# Connector policy — which ones, what shape, in what order, and where they live

> Written 2026-07-31 after the same conversation happened several times without a written answer.
> Scope: how Kira, the orchestrator and the swarm acquire new capabilities — Drive, Gmail, Xero,
> WhatsApp, phone, Checkpoint, and whatever a client asks for next.
>
> This exists because "which connector next?" has been answered by whoever was in the room, and the
> cost of a wrong answer is not a wasted sprint — it is a refresh token to somebody's entire business,
> held forever, for a workflow nobody uses.

---

## A. Deciding WHICH connectors

### The gate — both halves, or it does not get built

1. **It appears in a captured ask.** A real owner asked for it, in his own words, and we have the
   row. Not "clients will want this."
2. **It completes a NAMED workflow end to end.** "Connect Xero" is not a workflow. "Tell me what's
   owed without opening Xero" is.

Anything failing either half goes on the list and waits. This is the same discipline as the
distributor gate in the business model: demand is evidence, not intuition.

### Then rank on four questions

- **Does it close a Genome leak?** The product exists because knowledge escapes undocumented. A
  connector that captures knowledge which is currently evaporating outranks one that saves clicks.
  Phone calls are the extreme case: decisions made aloud, several times a day, recorded nowhere.
- **What did we already refuse?** A refusal is measured demand with a timestamp. The
  `unsupported` rows are the highest-quality backlog we have.
- **What is the marginal cost?** Reachable through an existing shared package or an existing OAuth
  consent screen is close to free. A new vendor, a new consent screen, a new verification is not.
- **What is the blast radius?** A refresh token is standing access to a business's documents, mail or
  money, held indefinitely. Ask what a leaked token reaches, and whether the workflow justifies it.

### Two hard "no" rules

- **Never risk an asset that IS the business.** The owner's mobile number, his primary mailbox, his
  accounting file. If the integration route can get the number banned or the account locked, it needs
  an explicit operator decision, never a default. (This is why personal-WhatsApp-as-him is not a
  default yes.)
- **Prefer one app, many consents.** A connector requiring per-client console work taxes every future
  client forever. If the only route is per-client OAuth apps, that cost belongs in the decision, not
  in a later surprise.

---

## B. What we mimic, and what we build fresh

Four tiers. Check them in order — the answer is usually higher up than expected.

| Tier | Situation | What to do |
|---|---|---|
| 1 | A `@caistech/*` package exists | **Consume it.** Never fork a shared helper. |
| 2 | It exists **twice** in products, unextracted | **Extract it now.** Second occurrence is the trigger. |
| 3 | It exists **once** in a sibling product | **Build the second to the SAME shape** — same types, field names, signatures, UX. Divergent implementations turn the eventual extraction from a lift into a rewrite. |
| 4 | It exists nowhere | **Build fresh — but to the canonical connector shape below.** |

**Live example of Tier 2:** Checkpoint has a single-identity Drive client; the orchestrator now has a
multi-tenant one. `SHARED_SERVICES.md` already names the pair as the open extraction candidate
`@caistech/google-workspace`. That is not a future idea — it is a decision already made and not yet
executed.

### The canonical connector shape

Every connector we have built that works looks like this, and a new one should not invent its own:

1. **OAuth consent, tenant asserted as a signed claim** — never a bare `?tenant=` parameter, because
   `/api/*` sits outside the session middleware.
2. **Tokens live in the orchestrator's `connections` table**, one row per tenant per provider.
   Neither product holds the other's service-role key.
3. **Granted scope is read back and stored** — never assumed. Consent screens let people untick.
4. **A status endpoint returns FACTS, never credentials** — explicit column list, never `select *`.
5. **A Settings surface states what was actually granted**, including "we could not find out" as a
   distinct state from "not connected".
6. **The agent's tool is gated on the connection existing**, so she cannot claim a capability she
   cannot invoke.
7. **Degrade, don't fake** — "I can't see your contacts" and "you have no Roger" are different
   sentences and must stay different.

---

## C. When and how to prioritise

Rank by **(asked-for × leak closed) ÷ (build cost + blast radius)**, then apply the ordering below.
It is deliberately not a pure value ranking — cheap certainties first buys the credibility to spend
on the expensive ones.

1. **Where our own code is the only gap.** Gmail is the standing example: scopes registered, consent
   screen ready, and `scopesFor()` simply never asks. Hours, not weeks.
2. **Where a daily leak is closed.** Phone calls. Highest value on the list and the highest cost, so
   stage it — off-the-shelf recording and transcription first, custom build only if that fails. That
   was the owner's own instinct and it is right.
3. **Where an existing shared package already reaches it.** Extending `@caistech/unipile-channels` is
   not a new integration.
4. **Where a client-facing tax is created.** Anything needing per-client console work is deferred
   unless it is the entire point of the engagement.
5. **Where an asset that IS the business is at risk.** Explicit decision, or not at all.

**Cost discipline applies to every connector**: anything metered needs a cap before it ships, not
after the first bill.

---

## D. How the three layers fit — and the rule that keeps them apart

The seam already exists. Most integration questions are answered by *not duplicating it*.

| Layer | Owns | Never |
|---|---|---|
| **Kira (frontend)** | the conversation, the owner's surfaces, the Genome, the read model | never holds a connector token; never decides an approval |
| **Orchestrator** | tasks, effects, connectors, tokens, the approval gate, execution, tenant identity | never renders an owner-facing page |
| **Swarm / agents** | the EXPANSION of what "doing" covers, behind the same wire contract | never a second orchestrator |

### Five rules

1. **Credentials never cross the seam. Facts do.** Kira asks "is Drive connected and what was
   granted"; it never receives a token. This is why the two products can hold different blast radii.
2. **Kira's tables are read models.** `kira_tasks` is what the owner's screens are built on and is
   never what an approval or a send is decided from. Losing sight of this cost three requests two days
   of invisibility.
3. **A connector is added ONCE, in the orchestrator, and every client inherits it.** This is the whole
   argument for the wire contract.
4. **New products become CLIENTS, not copies.** Checkpoint should dispatch into the one orchestrator
   rather than growing a parallel swarm. One orchestrator, many products.
5. **The agent's capability prompt is DERIVED from what is connected for THAT tenant** — see the
   capability-drift section in `OPEN_ITEMS.md`. There are currently three hand-maintained capability
   lists and they have already diverged; a connector that does not update all three is a connector
   the owner will be told she doesn't have.

### The integration order for any new connector

```
capability decided (A)  →  shape chosen (B)  →  built in the ORCHESTRATOR
     →  status exposed across the seam  →  Settings surface in Kira
     →  agent tool gated on the connection  →  capability list regenerated
     →  agents RE-PROVISIONED (a prompt change never reaches a minted agent)
```

That last step is the one that gets forgotten, and its failure mode is silent: the capability exists,
the tool works, and she keeps telling the owner she cannot do it.
