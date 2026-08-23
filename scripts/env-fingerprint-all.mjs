// Fingerprint every ElevenLabs/ConvAI/webhook-related env var in both env files.
import fs from 'node:fs';
import crypto from 'node:crypto';

const files = [['local', '.env.local'], ['vercel', '.vercel-env-check']];
for (const [label, file] of files) {
  console.log(`=== ${label} (${file}) ===`);
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]*(?:ELEVENLABS|CONVAI|WEBHOOK|SIGNING)[A-Z0-9_]*)=(.*)$/i);
    if (!m) continue;
    const v = m[2].trim().replace(/^["']|["']$/g, '');
    if (!v) { console.log(`${m[1]}: <empty>`); continue; }
    console.log(`${m[1]}: len=${v.length} sha256=${crypto.createHash('sha256').update(v).digest('hex').slice(0, 12)}`);
  }
}
