// voice.config.ts
// Central registry of Kira's FIXED voice-agent ids (PRODUCT_STANDARDS §6 — the agent id lives in
// config, read in ONE place, instead of scattered NEXT_PUBLIC_* reads across components).
//
// Kira runs MULTIPLE fixed agents plus PER-USER operational agents. The per-user operational
// agent ids are dynamic (resolved from the `kira_agents` table at runtime by /chat/[agentId]) and
// are therefore NOT listed here — this file holds only the fixed, product-level agents.
//
// The ids remain sourced from NEXT_PUBLIC_* because the widgets consume them client-side; this
// module is the single place they are read, so a surface imports `voiceAgents.pubguard` rather
// than re-reading the env inline. The provisioning single-entry-point in cais-shared-services
// (scripts/voice-init.mjs --provision) can overwrite these with real provisioned ids.

import type { VoiceConfig } from '@caistech/elevenlabs-convai';

export const voiceAgents = {
  // Setup Kira — the onboarding agent on /start (drives the draft framework; journey_type var).
  setupKira: {
    agentId: process.env.NEXT_PUBLIC_SETUP_KIRA_AGENT_ID || '',
    placement: 'inline',
    mode: 'greeting',
    textFallback: true,
  },
  // PubGuard — the security-scan voice agent on /pubguard/scan.
  pubguard: {
    agentId: process.env.NEXT_PUBLIC_PUBGUARD_AGENT_ID || 'agent_01jmahk10gtrfs29dnf48gent9',
    placement: 'floating',
    mode: 'greeting',
    textFallback: true,
  },
} satisfies Record<string, VoiceConfig>;

export type VoiceAgentKey = keyof typeof voiceAgents;
