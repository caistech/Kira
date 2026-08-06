// components/BackToAccount.tsx
//
// A way back, on the two public pages a signed-in owner is routinely sent to.
//
// `/business-valuation` and `/plan` are deliberately PUBLIC and auth-unaware — most of their traffic
// is strangers, and that is the right design. But the dashboard links into the valuation, and the
// result page links into /plan, so a paying owner ends up on them constantly. Neither carries the app
// chrome, so mid-questionnaire the only two links on the page are the logo and the word "Kira", both
// going to the marketing home.
//
// A tester put the cost plainly: "if I get to question six and want to check something in my Genome,
// the only way back into my own account is the browser back button or typing an address. I don't type
// addresses." That is §9's zero-dead-ends, and it is worse than a dead end — it is a dead end that
// only affects the people who are already paying.
//
// SHOWN ONLY WHEN SIGNED IN, so the public page stays exactly what it is for a stranger: no account
// nav, no implication that they have one. The whole shell would be wrong here — it would frame a
// public marketing page as an app screen — so this is one line and a link.

import Link from 'next/link';

import { getAuthUser, getCurrentAppUser } from '@/lib/auth';
import { realFirstName } from '@/lib/user-name';

export async function BackToAccount() {
  const user = await getCurrentAppUser();
  if (!user?.id) return null;

  // GREET HIM BY NAME, OR DO NOT GREET HIM BY NAME.
  //
  // This read `user.first_name` directly, which the signup trigger fills from the front half of his
  // email when no metadata is supplied — so a signed-in owner was told "You are signed in,
  // dennis+ray" on the very page that asks, a few inches lower, "What should we call you?" Being
  // addressed by a machine-made string is worse than not being addressed at all: it says the product
  // does not know him AND is pretending otherwise. `realFirstName` returns null in exactly that case
  // and the greeting falls back to the plain sentence, which was always the correct fallback here.
  const authUser = await getAuthUser();
  const name = realFirstName(user, authUser?.email);

  return (
    <div className="border-b border-amber-200/60 bg-amber-50/80 px-5 py-2 text-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <span className="text-stone-600">You are signed in{name ? `, ${name}` : ''}.</span>
        <Link
          href="/dashboard"
          className="inline-flex min-h-[44px] items-center font-semibold text-violet-700 underline underline-offset-4"
        >
          Back to your account
        </Link>
      </div>
    </div>
  );
}
