// lib/supabase/server-session.ts
// SSR user-session Supabase client using the publishable API key + cookies.
// Used by server components, route handlers, and server actions.
//
// Privileged/server-side database access remains in server.ts via
// createServiceClientV2().

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSessionClient() {
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
            // Called from a Server Component where cookies are read-only.
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
            // Called from a Server Component where cookies are read-only.
          }
        },
      },
    },
  );
}