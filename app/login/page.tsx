// @public-route
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';
import { safeNextPath } from '@/lib/safe-next';

export const metadata = { title: 'Sign in · Kira' };

// Honor where the user was headed when middleware bounced them to /login
// (`?next=<path>`), so signing in (password AND magic link) lands them back
// where they were instead of always at /talk. Falls back to /talk when absent
// or unsafe (see safeNextPath) — the existing Kira Exec behaviour.
export default function LoginPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const redirectTo = safeNextPath(searchParams?.next) ?? '/talk';

  return (
    <AuthShell>
      <Suspense>
        <AuthForm
          mode="login"
          variant="user"
          // Kira Exec default: land straight on the user's own Kira. /talk resolves the
          // owner's active agent and renders the conversation in place; a brand-new user with no
          // agent yet falls through to /dashboard, the home screen (saved valuation, the eleven
          // questions, "you haven't met Kira yet"). When middleware bounced them here with a
          // `?next=`, honor it instead so the flow picks up where they left off.
          redirectTo={redirectTo}
          title="Welcome back"
          subtitle="Sign in to your Kira."
        />
      </Suspense>
    </AuthShell>
  );
}
