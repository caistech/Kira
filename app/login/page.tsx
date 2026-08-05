// @public-route
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Sign in · Kira' };

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm
          mode="login"
          variant="user"
          // Kira Exec: land straight on the user's own Kira, not the setup/picker. /talk resolves the
          // owner's active agent and renders the conversation in place; a brand-new user with no
          // agent yet falls through to /dashboard, which is the home screen and carries the right
          // empty state for him (saved valuation, the eleven questions, "you haven't met Kira yet").
          redirectTo="/talk"
          title="Welcome back"
          subtitle="Sign in to your Kira."
        />
      </Suspense>
    </AuthShell>
  );
}
