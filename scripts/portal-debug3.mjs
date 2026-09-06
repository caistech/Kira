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
const authUserId = '0adb5a8a-6a14-4df8-8983-791bf7cbc20e';

const { data: creds, error } = await supabase
  .from('auth_credentials')
  .select('*')
  .eq('auth_user_id', authUserId);
console.log('auth_credentials error:', error?.message ?? 'none');
for (const c of creds ?? []) console.log(JSON.stringify(c));

const ids = [];
for (const c of creds ?? []) if (c.person_id) ids.push(c.person_id);
ids.push('8c298dce-3880-432b-88a2-0004a5958eba');
ids.push('34e2eacb-2fc0-465c-8337-4414e2d99b43');
const { data: persons, error: pErr } = await supabase
  .from('persons')
  .select('person_id, email, first_name, last_name, created_at')
  .in('person_id', ids);
console.log('persons error:', pErr?.message ?? 'none');
for (const p of persons ?? []) console.log(JSON.stringify(p));

const { data: allCreds, error: allErr } = await supabase
  .from('auth_credentials')
  .select('auth_user_id, person_id, status, selected_org_id')
  .limit(50);
console.log('\nall auth_credentials error:', allErr?.message ?? 'none');
for (const c of allCreds ?? []) console.log(JSON.stringify(c));