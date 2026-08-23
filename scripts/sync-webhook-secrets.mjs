// Sync real webhook secrets from .env.local into Vercel production env.
// Prints only fingerprints, never values.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const NAMES = [
  'ELEVENLABS_WEBHOOK_SECRET',
  'CONVAI_TOOL_SECRET',
  'ELEVENLABS_TOOL_WEBHOOK_SECRET',
  'KIRA_TOOL_WEBHOOK_SECRET',
];

const APPLY = process.argv.includes('--apply');
const envText = fs.readFileSync('.env.local', 'utf8');

for (const name of NAMES) {
  const m = envText.match(new RegExp(`^${name}=(.*)$`, 'm'));
  if (!m || !m[1].trim()) {
    console.log(`${name}: MISSING LOCALLY — skipped`);
    continue;
  }
  const value = m[1].trim().replace(/^["']|["']$/g, '');
  const fp = crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
  if (!APPLY) {
    console.log(`${name}: would set (len=${value.length} sha256=${fp})`);
    continue;
  }
  try {
    execFileSync('vercel', ['env', 'add', name, 'production', '--force', '--scope', 'corporate-ai-solutions'], {
      input: value,
      stdio: ['pipe', 'pipe', 'inherit'],
      shell: true,
    });
    console.log(`${name}: SET on vercel production (len=${value.length} sha256=${fp})`);
  } catch (e) {
    console.log(`${name}: FAILED — ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  }
}
console.log(APPLY ? '\nNOTE: redeploy required for serverless functions to see new env values.' : '\n[dry run — pass --apply]');
