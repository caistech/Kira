import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = readFileSync(path.resolve(__dirname, '..', '.env.local'), 'utf8');
function get(key) {
  const line = env.split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  const value = line.slice(key.length + 1).trim();
  return value.length >= 2 && value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}

const supabase = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'));

const orgId = '11f7dfa8-14fd-4994-9738-42927c0555b6';

const { data: codes, error: codesErr } = await supabase
  .from('beta_codes')
  .select('code, email, first_name, last_name, beta_type, organisation_id, expires_at, redeemed_at, revoked_at, created_at')
  .eq('organisation_id', orgId)
  .order('created_at', { ascending: false });

console.log('beta_codes error:', codesErr?.message ?? 'none');
console.log('beta_codes rows:', codes?.length ?? 0);
console.log('sample:', JSON.stringify(codes?.[0] ?? null));

const { data: memberships, error: memErr } = await supabase
  .from('organisation_memberships')
  .select('membership_id, organisation_id, person_id, role, status, valid_from, valid_to, portal_access')
  .eq('person_id', '34e2eacb-2fc0-465c-8337-4414e2d99b43')
  .in('role', ['superadmin', 'admin', 'member']);

console.log('memberships error:', memErr?.message ?? 'none');
console.log('memberships rows:', memberships?.length ?? 0);
console.log('memberships:', JSON.stringify(memberships));