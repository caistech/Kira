import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Set admin password · Kira' };

export default function AdminPasswordResetPage() {
  return (
    <AuthShell>
      <AuthForm
        mode="reset"
        variant="admin"
        redirectTo="/admin"
        title="Set a new password"
        subtitle="Enter a new password for your operator account."
      />
    </AuthShell>
  );
}
