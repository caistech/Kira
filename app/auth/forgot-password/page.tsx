import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Reset password · Kira' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <AuthForm
        mode="forgot"
        variant="user"
        title="Reset your password"
        subtitle="We'll email you a link to set a new one."
      />
    </AuthShell>
  );
}
