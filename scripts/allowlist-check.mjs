import { readFileSync } from 'node:fs';
const env = readFileSync('.env.local', 'utf8').split(/\r?\n/);
const line = env.find((l) => l.startsWith('ADMIN_EMAILS='));
const v = line.slice('ADMIN_EMAILS='.length).trim().replace(/^"|"$/g, '');
const list = v.split(',').map((s) => s.trim().toLowerCase());
console.log('dennis on local allowlist now:', list.includes('dennis@corporateaisolutions.com'));
console.log('allowlist count:', list.length);