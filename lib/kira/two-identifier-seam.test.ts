// Two-identifier seam tests (Scope D): verify that the caller's person_id — not the agent
// owner — is used for greeting, session identity, and conversation context. These tests read
// source files and assert on the structural contracts, not on runtime behaviour, so they run
// without DB, network, or mocked modules.
//
// WHY SOURCE-SCANNING. The session identity is resolved inside an async closure on a factory
// (kiraConvaiRoutes → resolveSession) and inside an exported async function (handleKiraContext);
// both make real DB calls through a service client. Replicating that for unit tests would mean
// mocking the entire Supabase client, which is brittle and duplicates the integration tests.
// Source scanning pins the structural invariants that would break if anyone reverts the fix —
// wrong RPC args, wrong variable names, owner-scoped greeting — and is fast, explicit, and
// import-free.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../..');

const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

const manifest   = read('lib/kira/tool-manifest.mjs');
const convai     = read('lib/kira/convai.ts');
const uidTools   = read('lib/kira/uid-tools.ts');
const ctxRoute   = read('app/api/kira/conversation/context/route.ts');
const agentRoute = read('app/api/kira/agent/route.ts');
const chatPage   = read('app/chat/[agentId]/page.tsx');

// Strip comments so comment-only regressions don't trick the scanner.
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the start_conversation tool carries a caller-carried user_id param', () => {
  it('toolDefsFor adds user_id as a platform-filled dynamic_variable to get_conversation_context', () => {
    // The tool schema must include a user_id param bound to the session dynamic variable
    // `user_id`, which the widget sets from the authenticated caller's person_id. ElevenLabs
    // fills it into the webhook body per conversation. Without this, the webhook has no
    // caller identity and the greeting resolves to the baked ?uid (the provisioner).
    expect(manifest).toMatch(/dynamic_variable:\s*['"]user_id['"]/);
    expect(manifest).toMatch(/properties\.user_id\s*=/);
    // The tool is named get_conversation_context — the test targets the right tool.
    expect(manifest).toMatch(/get_conversation_context/);
  });
});

describe('resolveSession reads caller-carried user_id from the webhook body', () => {
  it('reads body.user_id as the caller person before falling back to kira_agents.user_id', () => {
    // The resolveSession closure must look at body.user_id (the platform-filled caller)
    // before consulting kira_agents.user_id (the owner). A shared org agent where every
    // conversation resolves to the provisioner is exactly the leak Scope D exists to prevent.
    const body = strip(convai);
    const rsStart = body.indexOf('resolveSession: async');
    expect(rsStart).toBeGreaterThan(-1);
    const rsBlock = body.slice(rsStart, rsStart + 2_000);
    // Caller-carried value read from body
    expect(rsBlock).toMatch(/body\.user_id/);
    // Returns callerPersonId when present
    expect(rsBlock).toMatch(/\{ userId: callerPersonId \}/);
    // Owner binding is the fallback, not the primary
    expect(rsBlock).toMatch(/return \{ userId: agent\.user_id as string \}/);
  });

  it('validates the caller is an active member of the agent organisation', () => {
    // The webhook has no auth cookie, so an injected person_id must not be accepted without a
    // membership check. resolveSession must query organisation_memberships for the agent's org.
    expect(convai).toMatch(/organisation_memberships/);
    expect(convai).toMatch(/eq\('person_id',\s*callerPersonId\)/);
    expect(convai).toMatch(/eq\('status',\s*'active'\)/);
  });
});

describe('handleKiraContext reads the caller-carried id before the baked ?uid', () => {
  it('calls callerUidFromBody before uidFrom (the baked ?uid)', () => {
    const body = strip(uidTools);
    const hcStart = body.indexOf('export async function handleKiraContext');
    expect(hcStart).toBeGreaterThan(-1);
    const hcBlock = body.slice(hcStart, hcStart + 400);
    // Caller-carried value must be read first, via callerUidFromBody; fallback to ?uid
    expect(hcBlock).toMatch(/callerUidFromBody\(req\)/);
    expect(hcBlock).toMatch(/uidFrom\(req\)/);
    // uid is derived from caller first, ?uid second
    expect(hcBlock).toMatch(/callerUid \|\| uidFrom\(req\)/);
  });

  it('the RPC call uses p_user_id, not the non-existent p_organisation_id', () => {
    // The live DB function signature is get_conversation_context(p_agent_id, p_user_id,
    // p_message_limit). There is no p_organisation_id parameter. Passing one made every
    // has_history read silently return false — the voice greeting never worked via this path.
    const body = strip(uidTools);
    const rpcIdx = body.indexOf("rpc('get_conversation_context'");
    expect(rpcIdx).toBeGreaterThan(-1);
    const rpcBlock = body.slice(rpcIdx, rpcIdx + 300);
    expect(rpcBlock).toMatch(/p_user_id:\s*uid/);
    expect(rpcBlock).not.toMatch(/p_organisation_id/);
  });

  it('scope the last-conversation query by the caller user_id', () => {
    // A shared org agent whose last-conv query scopes only by organisation would find any
    // member's most recent conversation and use its agent for the greeting — returning
    // has_history false for a caller with their own history on the same agent.
    const body = strip(uidTools);
    expect(body).toMatch(/\.eq\('user_id',\s*uid\)/);
  });
});

describe('the conversation/context route honours the caller person, not the agent owner', () => {
  it('passes p_user_id = caller person, not p_organisation_id', () => {
    // Same RPC fix as above, but this is the page-rendered greeting path. The caller is
    // authenticated via cookie; organisationContext.personId is the canonical person.
    const body = strip(ctxRoute);
    const rpcIdx = body.indexOf("rpc('get_conversation_context'");
    expect(rpcIdx).toBeGreaterThan(-1);
    const rpcBlock = body.slice(rpcIdx, rpcIdx + 300);
    expect(rpcBlock).toMatch(/p_user_id:\s*organisationContext\.personId/);
    expect(rpcBlock).not.toMatch(/p_organisation_id/);
  });
});

describe('the agent route returns the caller person_id', () => {
  it('response includes person_id derived from the authenticated caller', () => {
    // The chat page needs the caller's person_id for the VoiceWidget's userId prop (which
    // sends the platform-filled dynamic variable). The agent's user_id is provenance only.
    const body = strip(agentRoute);
    expect(body).toMatch(/person_id:\s*organisationContext\.personId/);
  });
});

describe('the chat page passes the caller person to the VoiceWidget', () => {
  it('VoiceWidget receives userId={agentInfo?.person_id}', () => {
    // Without this, the widget sends no dynamicVariables.user_id and the webhook body
    // carries no caller identity — the seam falls back to the baked ?uid (provisioner).
    expect(chatPage).toMatch(/userId=\{agentInfo\?\.(person_id)\}/);
  });

  it('AgentInfo interface declares person_id as string', () => {
    expect(chatPage).toMatch(/person_id:\s*string/);
  });
});
