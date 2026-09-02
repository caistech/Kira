// lib/supabase/server-session.ts
// SSR user-SESSION Supabase client (anon key + cookies), for auth in server components,
// route handlers, and server actions. Distinct from server.ts's createServiceClient (service
// role, no session) which stays the client for privileged data access.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// NEW API KEY MODEL — session client with publishable key
export async function createSessionClientV2() {
  const cookieStore = await cookies();
  return createServerClientV2(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            /* called from a Server Component — ignore */
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            /* called from a Server Component — ignore */
          }
        },
      },
    }
  );
}
