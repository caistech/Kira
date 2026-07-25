import { cookies } from 'next/headers';

import { AuthShell } from '@/components/auth/AuthShell';
import { AuthForm } from '@/components/auth/AuthForm';
import { ATTRIBUTION_COOKIE, attribution } from '@/lib/introducer';

export const metadata = { title: 'Create account · Kira' };
export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  // Only ask how they heard about us when we don't already know. Someone who arrived through an
  // introducer's link carries a signed first-touch cookie — asking them anyway is noise, and a
  // contradictory typed answer sitting next to a signed attribution is a dispute waiting to
  // happen. The cookie is HttpOnly, so this decision has to be made here on the server.
  const existing = (await cookies()).get(ATTRIBUTION_COOKIE)?.value;
  const alreadyAttributed = attribution.parse(existing) !== null;

  return (
    <AuthShell>
      <AuthForm
        mode="signup"
        variant="user"
        redirectTo="/dashboard"
        title="Create your Kira"
        subtitle="Your fractional exec — she remembers everything."
        askReferralSource={!alreadyAttributed}
      />
    </AuthShell>
  );
}
