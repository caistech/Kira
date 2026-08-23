// Fingerprint-compare ELEVENLABS_WEBHOOK_SECRET between .env.local and Vercel prod pull.
import fs from 'node:fs';
import crypto from 'node:crypto';

function fingerprint(label, text) {
  const m = text.match(/^ELEVENLABS_WEBHOOK_SECRET=(.*)$/m);
  if (!m || !m[1].trim()) return console.log(`${label}: NOT SET`);
  const v = m[1].trim().replace(/^["']|["']$/g, '');
  console.log(`${label}: len=${v.length} sha256=${crypto.createHash('sha256').update(v).digest('hex').slice(0, 12)}`);
}

fingerprint('local ', fs.readFileSync('.env.local', 'utf8'));
fingerprint('vercel', fs.readFileSync('.vercel-env-check', 'utf8'));
