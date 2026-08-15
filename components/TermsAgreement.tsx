'use client';

// components/TermsAgreement.tsx
//
// ONE checkbox, one wording, every path that creates an account.
//
// WHY IT EXISTS. Terms acceptance was written in exactly one place — the /signup form — and the two
// paths that create an account any OTHER way did not carry it. So `users.terms_accepted_at` was
// stamped for people who signed up free and NULL for everyone who had actually paid, which is the
// wrong way round for the only group with a contract. The migration's own comment had already gone
// stale as a result: it says a NULL means "the account pre-dates this", and it also meant "they
// paid".
//
// The fallback until now was the browsewrap line in lib/terms.ts — "by creating an account or using
// Kira, you agree to these Terms". That is materially weaker than a recorded affirmative act,
// especially against a consumer, and especially for a product holding what this one holds.
//
// ⚠️ RECORD THE VERSION, NOT JUST THE TICK. `terms_version` travels with `terms_accepted`, because a
// product that can show someone agreed but not WHAT they agreed to has kept the half of the record
// that does not settle anything. The DB trigger already expects both.
//
// ⚠️ UNTICKED BY DEFAULT, ALWAYS. A pre-ticked box is not consent in any jurisdiction that has
// thought about it, and it is the one shortcut that turns this whole change into theatre.
//
// SIZING IS NOT COSMETIC HERE. 16px text and a 44px tap row: this is a legal control, on a product
// whose users are commonly in their sixties, and `@caistech/corporate-components` shipped this exact
// field at 12px with a 16px box until it was measured on a real phone.

import Link from 'next/link';

import { TERMS_VERSION } from '@/lib/terms';

export { TERMS_VERSION };

export function TermsAgreement({
  checked,
  onChange,
  id = 'terms-agreement',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-3 py-2 text-base sm:text-sm"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-stone-400 text-violet-600 focus:ring-violet-500"
      />
      <span className="text-stone-700">
        I agree to the{' '}
        <Link href="/terms" target="_blank" className="font-semibold text-violet-700 underline underline-offset-2">
          Terms
        </Link>{' '}
        and the{' '}
        <Link href="/privacy" target="_blank" className="font-semibold text-violet-700 underline underline-offset-2">
          Privacy Policy
        </Link>
        .
        {/* Opens in a new tab on purpose: sending someone away from a half-filled payment or
            redemption form to read a legal page, and losing what they had typed, is how a required
            checkbox becomes a thing people tick without reading. */}
      </span>
    </label>
  );
}
