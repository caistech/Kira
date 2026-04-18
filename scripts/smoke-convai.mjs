// Smoke test for the ConvAI model fix (eleven_turbo_v2_5 -> eleven_flash_v2).
// Mirrors the payload shape used by lib/elevenlabs/createConvaiAgent.ts and
// the 5 other call sites patched in commit 4a5e7cb.
//
// Success = ElevenLabs returns 200 + agent_id with model_id=eleven_flash_v2
// and language=en. The test agent is named SMOKE_DELETE_ME_<ts> so you can
// find and delete it from the ElevenLabs dashboard afterward.
//
// Usage: node scripts/smoke-convai.mjs

import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error('ELEVENLABS_API_KEY missing from .env.local');
  process.exit(1);
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const agentName = `SMOKE_DELETE_ME_${ts}`;
const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - matches app/api/kira/create

console.log(`Creating test agent: ${agentName}`);

const res = await fetch(
  'https://api.elevenlabs.io/v1/convai/agents/create',
  {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: agentName,
      conversation_config: {
        agent: {
          prompt: {
            prompt: 'You are a smoke-test agent. Do not use in production.',
            llm: 'gpt-4o-mini',
            temperature: 0.7,
          },
          first_message: 'This is a smoke test.',
          language: 'en',
        },
        tts: {
          voice_id: voiceId,
          model_id: 'eleven_flash_v2',
        },
      },
    }),
  }
);

const bodyText = await res.text();

if (!res.ok) {
  console.error(`FAIL: ${res.status} ${res.statusText}`);
  console.error(bodyText);
  process.exit(2);
}

const data = JSON.parse(bodyText);
console.log(`PASS: agent_id=${data.agent_id}`);
console.log(`Delete from dashboard: https://elevenlabs.io/app/conversational-ai/agents/${data.agent_id}`);
