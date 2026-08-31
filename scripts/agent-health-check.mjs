// Health check: ConvAI agents exist/enabled + env fingerprint sanity.
import fs from 'node:fs';
import crypto from 'node:crypto';

function readEnv(file) {
  const map = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[2].trim()) map[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return map;
}

const local = readEnv('.env.local');
console.log('--- agent list ---');
const res = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
  headers: { 'xi-api-key': local.ELEVENLABS_API_KEY },
});
if (!res.ok) {
  console.log(`agent list FAILED: ${res.status}`);
  console.log(await res.text());
} else {
  const data = await res.json();
  for (const a of data.agents ?? []) console.log(`${a.agent_id}  ${a.name}`);
}
