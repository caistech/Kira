import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component: cookie mutation may be unavailable.
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Server Component: cookie mutation may be unavailable.
          }
        },
      },
    },
  );
}

/**
 * Compatibility alias during migration.
 *
 * New code should use createSessionClientV2().
 */
export const createSessionClient = createSessionClientV2;