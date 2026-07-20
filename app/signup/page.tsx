import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Create account · Kira' };

export default function SignupPage() {
  return (
    <AuthShell>
      <AuthForm
        mode="signup"
        variant="user"
        redirectTo="/dashboard"
        title="Create your Kira"
        subtitle="Your AI executive assistant that remembers you."
      />
    </AuthShell>
  );
}
