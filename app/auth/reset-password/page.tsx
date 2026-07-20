import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Set new password · Kira' };

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <AuthForm
        mode="reset"
        variant="user"
        redirectTo="/dashboard"
        title="Set a new password"
        subtitle="Enter a new password for your account."
      />
    </AuthShell>
  );
}
