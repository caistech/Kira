'use client';

// components/SignOutButton.tsx
import { createClient } from '@/lib/supabase/browser';

export function SignOutButton({ className }: { className?: string }) {
  const supabase = createClient();
  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign('/login');
  }
  return (
    <button onClick={signOut} className={className}>
      Sign out
    </button>
  );
}
