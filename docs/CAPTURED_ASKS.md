# Captured asks — what the owner actually asked for, and whether it is possible

> Pulled 2026-07-31 from `kira_memory` (active + parked) and the `unsupported` / `failed` rows in
> both databases. These are things the owner asked for in conversation that were never actioned.
>
> Every verdict below was checked against the actual source, not estimated. Three changed on
> inspection. Decision policy for acting on any of it: `CONNECTOR_POLICY.md`.

---

## 1. Email access — a SEGREGATION question now, not an access one

The ask was *"access to Google Drive and three email accounts"*. It predates the
one-account-one-business decision and is wrong as stated: `dennis@factory2key.com.au` belongs to this
Kira; `mcmdennis@gmail.com` and `dennis@corporateaisolutions.com` belong to GBTA's account.

**The architecture already enforces it** — `googleConnectionFor` selects one `google` row per tenant,
so a Kira account has exactly one mailbox by construction. The three-mailbox version was never
buildable without a schema change we now do not want.

The remaining gap is one line: the Gmail scopes are registered in the Google console, but
`scopesFor()` never requests them, so the consent screen never offers them. The stated driver
(*"track the email sent to IRIS"*) is Executor.AI work and moves to GBTA. The Factory2Key reasons are
separate and real: the RFQ to Roger, the soil-testing thread with Dave, supplier correspondence.

## 2. WhatsApp — possible, two routes, pick deliberately

- **Meta Cloud API (official).** Needs a **dedicated number** that can no longer be used in the normal
  WhatsApp app, business verification, and pre-approved templates outside a 24-hour reply window;
  priced per conversation. Does **not** send as his personal WhatsApp.
- **Unipile (as-me).** Sends from his existing number and chats. `@caistech/unipile-channels` already
  wraps Unipile for LinkedIn/Gmail/Outlook and the vendor supports WhatsApp, so this extends an
  existing shared package rather than adding a vendor. **But** it holds a WhatsApp Web session, which
  is outside Meta's terms and carries a real risk of the number being banned.
- **Recommendation:** do not put his mobile number at risk — for this ICP the number *is* the
  business. Split the ask: to capture what was agreed, ingest and read; for outbound client
  messaging, Cloud API on a separate business number.

## 3. Checkpoint ↔ Drive, and "mirror the swarm into Checkpoint"

Mostly already built. The work is consolidation, not construction.

- Checkpoint already has a Drive client (`f2k-checkpoint/src/lib/drive/client.ts`, single identity).
  The orchestrator now has a multi-tenant one. `SHARED_SERVICES.md` already names this exact pair as
  the open extraction candidate `@caistech/google-workspace`. Second occurrence reached.
- **Do NOT mirror the swarm into Checkpoint.** The orchestrator is a wire contract any product can be
  a client of; Kira is simply the first. Checkpoint becomes a **second client of one orchestrator**,
  not a parallel copy.
- Checkpoint is REGULATED tier: zero convention drift, and no connector may fork the canonical
  property feed.

## 4. Supplier emails with attachments — possible, two small additions

- The Drive client exposes `listFiles` and `readFileText` — **text only**. An attachment needs the raw
  bytes, so a binary fetch is required alongside it.
- `@caistech/email-send` has **no attachment support**. Resend's API does, so this is an addition to
  the shared package rather than a workaround.
- Everything else is in place: per-tenant Drive access, the approval gate, the compliant sender.

## 5. Getting things INTO her

- **Chat text input — the cheapest win on this list.** `@caistech/elevenlabs-convai` already supports
  one-conversation voice + text via an opt-in `textInput`, and we consume that package. A flag, not a
  build.
- **Upload during a conversation already exists** (`/api/kira/knowledge/upload`, accepting
  pdf/doc/docx/txt/md/csv/xls/xlsx).
- **URLs are NOT supported and never were.** The route reads `formData.get('file')` and nothing else.
- **Photo capture** — the picker's `accept` list has no image types and no `capture` attribute, so
  photos are refused before they leave the phone. `image/*` + `capture="environment"` gives camera
  capture on mobile.

## 6. The two logged bugs — probable causes

- **Conversation stops when switching tabs on mobile.** Mobile browsers suspend backgrounded tabs: the
  audio context suspends, the mic stream is released, the realtime connection drops. iOS Safari is the
  most aggressive. It cannot be prevented — the fix is to handle `visibilitychange`, warn before it
  drops, and resume on return instead of dying silently.
- **The Executor.AI upload that "never arrived".** One half is certain: a URL is not an accepted input
  (§5). The file half needs a repro before anyone changes code — file type, size, or a missing
  `agentId` on the attach step are all candidates.

## 7. In-app phone calls — the largest ask, and really a Genome argument

His words: *"currently making phone calls without note-taking, leading to lost verbal decisions and a
knowledge gap"* — the exact leak the product exists to stop, happening several times a day.

Specified: uses his existing mobile contacts · keeps normal call quality · records · transcribes ·
**auto-tags segments to specific projects** (Lot 109, Lot 91). His stated approach — off-the-shelf
recording and transcription first, custom build only if that fails — is the right staging.

## 8. Behaviours he has asked for — what is already true

| Ask | State |
|---|---|
| Conversation as the sole input point | built (that is the design) |
| Record + prioritise, delegate to the orchestrator | **built and proven today** |
| He initiates status checks rather than being pushed updates | built (`check_tasks`) |
| Surface forgotten / later-mentioned tasks | partial (`open-tasks.ts`) |
| Personal check-ins, "more human and caring" | prompt work, not built |
| Prompt to extract undocumented knowledge from his head | partial (Genome classifier) |
| **Ask which business/project when ambiguous** | **not built — now load-bearing, given two entities** |
| A business-system agent sweeping learned tasks into automation | not built |

## 9. Capability drift — THREE hand-maintained lists, already diverged

This is the "how do we make sure she knows what she can do" question, and the current answer is
*discipline*, which is why it has already failed.

Three separate hand-written sources:

1. `lib/capabilities.ts` (`CAN` / `CANNOT` / `ENFORCEMENT`) — imported by **exactly one file**,
   `app/what-she-does/page.tsx`. What we tell **customers**.
2. `lib/kira/prompts.ts` `capabilityBoundary` — what **she believes**.
3. The orchestrator's `OWNED_KINDS` + `CLASSIFY_SYSTEM` — what she actually **accepts**.

Nothing connects them. They have already drifted: she refuses to chase an invoice while the seed cron
does nothing but chase invoices.

**The fix is a mechanism, in four parts:**

- **One source.** `lib/capabilities.ts` becomes canonical; the prompt section and the classifier's
  kind list are **derived** from it. Generated, never retyped.
- **A test that fails on divergence.** Every dispatchable kind must appear in `CAN`; every `CAN` entry
  must map to a real tool or kind. It fails the moment a connector lands without updating the list.
- **Gate it on re-provision.** A prompt change does not reach an already-minted agent. Capability
  change ⇒ regenerate ⇒ reprovision.
- **Make it per-tenant where the capability depends on a connection.** "She can read your Drive" is
  only true if Drive is connected. **The pattern already exists** — `financialsSection` is appended
  ONLY to agents that actually hold `look_up_financials`, precisely so she cannot claim a capability
  she cannot invoke. Generalise that to every connector.

## 10. Xero is connected to the wrong entity for this account

`provider_org_name = 'Global Buildtech Australia Pty Ltd'` on the Factory2Key tenant. His own captured
asks match it (*"the current balance in Xero for Global Buildtech Australia"*), which confirms the
crossover rather than excusing it. Repoint at Factory2Key's Xero, or move it when the GBTA account
exists.
