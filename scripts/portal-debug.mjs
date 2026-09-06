import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8');
function get(key) {
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  if (!line) return undefined;
  const value = line.slice(key.length + 1).trim();
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'));
const personId = '34e2eacb-2fc0-465c-8337-4414e2d99b43';

const { data: memberships, error: memErr } = await supabase
  .from('organisation_memberships')
  .select('membership_id, organisation_id, person_id, role, status, portal_access, valid_from, valid_to, can_spend')
  .eq('person_id', personId);

console.log('=== ALL MEMBERSHIPS for', personId, '===');
console.log('error:', memErr?.message ?? 'none');
console.log('rows:', memberships?.length ?? 0);
for (const m of memberships ?? []) {
  console.log(JSON.stringify(m));
}

const orgIds = [...new Set((memberships ?? []).map((m) => m.organisation_id).filter(Boolean))];
if (orgIds.length) {
  const { data: orgs, error: orgErr } = await supabase
    .from('organisations')
    .select('organisation_id, legal_name, name, created_at')
    .in('organisation_id', orgIds);
  console.log('=== ORGANISATIONS for these memberships ===');
  console.log('error:', orgErr?.message ?? 'none');
  for (const o of orgs ?? []) console.log(JSON.stringify(o));
}

const { data: creds, error: credErr } = await supabase
  .from('auth_credentials')
  .select('auth_user_id, person_id, selected_org_id, status, email')
  .eq('person_id', personId);
console.log('=== AUTH_CREDENTIALS ===');
console.log('error:', credErr?.message ?? 'none');
for (const c of creds ?? []) console.log(JSON.stringify(c));

const { data: allOrgs, error: allOrgErr } = await supabase
  .from('organisations')
  .select('organisation_id, legal_name, name')
  .order('created_at', { ascending: false });
console.log('=== ALL ORGANISATIONS (count ' + (allOrgs?.length ?? 0) + ') ===');
console.log('error:', allOrgErr?.message ?? 'none');
for (const o of allOrgs ?? []) console.log(o.organisation_id, '|', o.legal_name, '|', o.name);

const { count: betaCount } = await supabase
  .from('beta_codes')
  .select('code', { count: 'exact', head: true });
console.log('=== beta_codes total:', betaCount, '===');