// lib/supabase/browser.ts
// Supabase client for browser/client components

import { createBrowserClient } from '@supabase/ssr';

// LEGACY JWT — client-side auth
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// NEW API KEY MODEL — client-side auth with publishable key
export function createClientV2() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}