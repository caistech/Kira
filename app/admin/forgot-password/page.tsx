import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Admin reset · Kira' };

export default function AdminForgotPasswordPage() {
  return (
    <AuthShell>
      <AuthForm
        mode="forgot"
        variant="admin"
        title="Reset admin password"
        subtitle="We'll email you a link to set a new one."
      />
    </AuthShell>
  );
}
