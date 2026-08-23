// Probe the prod webhook with an ElevenLabs-format signature built from a candidate secret.
// Usage: node scripts/webhook-probe.mjs <local|vercel>
import fs from 'node:fs';
import crypto from 'node:crypto';

const which = process.argv[2] ?? 'local';
const file = which === 'vercel' ? '.vercel-env-check' : '.env.local';
const m = fs.readFileSync(file, 'utf8').match(/^ELEVENLABS_WEBHOOK_SECRET=(.*)$/m);
if (!m) { console.log(`${file}: secret not found`); process.exit(1); }
const secret = m[1].trim().replace(/^["']|["']$/g, '');

const body = JSON.stringify({
  type: 'post_call_verification_only',
  note: 'signature-gate probe, malformed by design',
});
const t = Math.floor(Date.now() / 1000);
const v0 = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');

const res = await fetch('https://kiraexec.com/api/kira/webhook', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'elevenlabs-signature': `t=${t},v0=${v0}` },
  body,
});
console.log(`secret-source: ${file} (${which})`);
console.log('status:', res.status);
console.log('body:', await res.text());
