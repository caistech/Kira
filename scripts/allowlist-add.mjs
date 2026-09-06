import { readFileSync, writeFileSync } from 'node:fs';
const raw = readFileSync('.env.local', 'utf8');
const lines = raw.split(/\r?\n/);
const needle = 'ADMIN_EMAILS=';
const idx = lines.findIndex((l) => l.startsWith(needle));
const current = lines[idx]
  .slice(needle.length)
  .trim()
  .replace(/^"|"$/g, '');
const emails = current
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
if (!emails.includes('dennis@corporateaisolutions.com')) {
  emails.push('dennis@corporateaisolutions.com');
}
const value = emails.map((e) => e.trim()).join(',');
console.log('emails before change (names only):');
for (const e of emails) console.log('  -', e.replace(/@.*/, '@…'));
lines[idx] = `${needle}"${value}"`;
writeFileSync('.env.local', lines.join('\r\n'), 'utf8');
console.log('written; dennis present:', emails.includes('dennis@corporateaisolutions.com'));