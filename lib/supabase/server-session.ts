// lib/supabase/server-session.ts
// SSR user-SESSION Supabase client (anon key + cookies), for auth in server components,
// route handlers, and server actions. Distinct from server.ts's createServiceClient (service
// role, no session) which stays the client for privileged data access.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          // Setting cookies throws in a plain Server Component render; the middleware owns
          // session refresh, so a no-op here is correct rather than fatal.
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
