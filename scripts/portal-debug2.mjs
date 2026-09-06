import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8');
const get = (key) => {
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return undefined;
  const value = line.slice(key.length + 1).trim();
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
};

const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'));

const { data: orgs, error: orgErr } = await supabase
  .from('organisations')
  .select('organisation_id, legal_name')
  .order('created_at', { ascending: false });
console.log('=== ALL ORGANISATIONS ===');
console.log('error:', orgErr?.message ?? 'none');
for (const o of orgs ?? []) console.log(o.organisation_id, '|', JSON.stringify(o.legal_name));

const { data: codes, error: codesErr } = await supabase
  .from('beta_codes')
  .select('code, beta_type, organisation_id, email, redeemed_at')
  .order('created_at', { ascending: false });
console.log('\n=== BETA_CODES BY ORG ===');
console.log('error:', codesErr?.message ?? 'none');
const byOrg = {};
for (const c of codes ?? []) {
  const org = c.organisation_id ?? '(null org)';
  byOrg[org] = byOrg[org] || { total: 0, redeemed: 0 };
  byOrg[org].total++;
  if (c.redeemed_at) byOrg[org].redeemed++;
}
for (const [org, v] of Object.entries(byOrg)) console.log(org, '=> total', v.total, 'redeemed', v.redeemed);
for (const c of codes ?? []) console.log(JSON.stringify({ code: c.code, beta_type: c.beta_type, org: c.organisation_id, redeemed: !!c.redeemed_at, email: (c.email ?? '').replace(/@.*/, '@…') }));

const { data: memberships, error: memErr } = await supabase
  .from('organisation_memberships')
  .select('organisation_id, role, status, portal_access')
  .limit(500);
console.log('\n=== MEMBERSHIP ROLE/PORTAL_ACCESS ROLLUP ===');
console.log('error:', memErr?.message ?? 'none');
const rollup = {};
for (const m of memberships ?? []) {
  const key = `${m.role} / ${m.portal_access} / ${m.status}`;
  rollup[key] = (rollup[key] ?? 0) + 1;
}
for (const [k, v] of Object.entries(rollup)) console.log(v, 'x', k);

const { data: people, error: pErr } = await supabase
  .from('persons')
  .select('person_id, email')
  .limit(100);
console.log('\n=== PERSONS ===');
console.log('error:', pErr?.message ?? 'none');
for (const p of people ?? []) console.log(p.person_id, '|', (p.email ?? '').replace(/@.*/, '@…'));