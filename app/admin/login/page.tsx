import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Admin sign in · Kira' };

export default function AdminLoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <AuthForm
          mode="login"
          variant="admin"
          redirectTo="/admin"
          title="Kira Admin"
          subtitle="Operator access only."
        />
      </Suspense>
    </AuthShell>
  );
}
