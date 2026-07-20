# HANDOFF — Consolidate voice onto the hub VoiceWidget (retire the forks)

**Created:** 2026-07-20 · **Source:** easy-claude-code session (voice provisioning standardisation in cais-shared-services)

## Why this is here

Kira carries **three** coexisting voice implementations — two are forks that should be retired
in favour of the canonical hub surface. You're already on branch
`fix/voice-memory-canonical-adoption`; this is the finish line for it.

**The rule:** the hub `VoiceWidget` from `@caistech/elevenlabs-convai/react` is canonical — the
README explicitly says *don't fork it*. "Morgan" is the persona rendered THROUGH that widget
(via `coachName`/`avatarUrl`), not a separate component. So the thing to deprecate here is
**Kira's custom widget**, not the hub widget.

**Upstream changes (cais-shared-services `main`):**
- `62e5426` — single provision-and-scaffold entry point; agent id lives in `voice.config.ts`
  (PRODUCT_STANDARDS §6), not a `NEXT_PUBLIC_*` env.
- `75103ec` — template ships the hub mount pre-wired (`components/VoiceAgent.tsx` reference impl).

## Current state in this repo

| File | What it is | Verdict |
|---|---|---|
| `lib/kira/convai.ts` | Adopts the canonical `@caistech/elevenlabs-convai` loop | ✅ keep / align to |
| `components/KiraVoiceWidget.tsx` | Custom widget on `@elevenlabs/react` `useConversation` | ❌ **fork — retire** |
| `lib/kira/VoiceAgent.tsx` | Raw `<elevenlabs-convai>` **CDN embed** (deprecated shape) | ❌ **retire** |

## Task list

1. **Render the hub widget.** Replace the mount that uses `KiraVoiceWidget` / the raw
   `<elevenlabs-convai>` element with `<VoiceWidget {...voiceConfig} />` from
   `@caistech/elevenlabs-convai/react` (use `coachName`/`avatarUrl` for the Kira coach face).
2. **Add `voice.config.ts`** carrying Kira's agent id (the single-entry-point flow), mirroring
   `templates/cais-build-template-v2/voice.config.ts`. Reference the template's
   `components/VoiceAgent.tsx` for the degrade-don't-fake wrapper pattern.
3. **Delete the forks** once the hub widget is live: `components/KiraVoiceWidget.tsx` and the raw
   `<elevenlabs-convai>` element in `lib/kira/VoiceAgent.tsx`.
4. **Keep the memory loop** — `lib/kira/convai.ts` already adopts the canonical recall→distil→
   persist loop; ensure the hub widget wires into it (it's the branch's whole point). Kira's
   custom table names (`kira_agents`, `kira_conversations`, …) are a supported divergence — pass
   them via the hub's `TableNames` option, don't fork the loop to accommodate them.
5. Behavioural sign-off with `/voice-auditor` (the "welcome-back" recall must actually fire).

## Note on the SDK-vs-CDN signature

Once on the hub `VoiceWidget`, "voice present" = the SDK launcher (`.convai-launch` /
`.convai-btn`) renders → opens `.convai-panel` → connects via WebRTC (or text fallback). The
`<elevenlabs-convai>` element is the *CDN-embed* signature and will be gone — don't let an audit
grade the SDK widget against the CDN rubric (a known false-negative).

## Reference
- Package README: `cais-shared-services/packages/elevenlabs-convai/README.md`
- Voice memory floor: `cais-shared-services/VOICE_MEMORY_STANDARD.md`
- Template reference impl: `cais-shared-services/templates/cais-build-template-v2/components/VoiceAgent.tsx`
