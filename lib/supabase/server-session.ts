// lib/supabase/server-session.ts
// SSR user-SESSION Supabase client (publishable key + cookies).
// Used for auth in server components, route handlers, and server actions.
// Distinct from server.ts's service-role client.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// V2 session client — publishable key
export async function createSessionClientV2() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },

        set(
          name: string,
          value: string,
          options: Record<string, unknown>,
        ) {
          try {
            cookieStore.set({
              name,
              value,
              ...options,
            });
          } catch {
            // Server Components cannot mutate cookies.
          }
        },

        remove(
          name: string,
          options: Record<string, unknown>,
        ) {
          try {
            cookieStore.set({
              name,
              value: '',
              ...options,
            });
          } catch {
            // Server Components cannot mutate cookies.
          }
        },
      },
    },
  );
}

// Temporary compatibility alias for code that has not yet been renamed.
// This does NOT create a second implementation.
export const createSessionClient = createSessionClientV2;