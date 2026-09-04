'use client';

// components/SignOutButton.tsx
import { createClientV2 } from '@/lib/supabase/browser';

export function SignOutButton({ className }: { className?: string }) {
  const supabase = createClientV2();
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
