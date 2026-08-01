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
        {/* The way OUT is a button, not an underlined phrase.
            A tester bounced here reported there was "no link back to the user sign-in" — and the
            link had been present for eleven days. He was not careless: it was `font-semibold
            underline` in text-amber-800, the SAME colour as the sentence around it, so it read as
            emphasis rather than as something to click. A link a user does not recognise as a link
            is, to that user, not a link. It is now a separate control with its own colour, border
            and 44px target, on its own line — because the person most likely to land here by
            mistake is the owner who was handed an admin URL, and this is the only thing on the
            page he can act on. */}
        {error === 'not_admin' && (
          <div className="mb-4 w-full max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p>That account isn’t an operator account.</p>
            <a
              href="/login"
              className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border border-amber-500 bg-white px-4 py-2 font-semibold text-amber-900 hover:bg-amber-100"
            >
              Sign in to use Kira →
            </a>
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
