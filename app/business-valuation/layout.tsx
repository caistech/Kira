// Wraps the public page with a way back for owners who are already signed in — see BackToAccount.
// A layout rather than an edit inside the page, because both pages are 'use client' and the auth
// check has to happen on the server.
import { BackToAccount } from '@/components/BackToAccount';

export default function PublicWithAccountBarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BackToAccount />
      {children}
    </>
  );
}
