import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = { title: 'Admin sign in · Kira' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell>
      <Suspense>
        {error === 'not_admin' && (
          <div className="mb-4 w-full max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            That account isn’t an operator account. If you came here to use Kira,{' '}
            <a href="/login" className="font-semibold underline">sign in as a user</a> instead.
          </div>
        )}
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
