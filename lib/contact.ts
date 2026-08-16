// lib/contact.ts — the address a stuck person is told to write to.
//
// ⚠️ A PLAIN MODULE, DELIBERATELY, AND THIS IS NOT STYLE. The same constant lives on
// `CORPORATE_AI_SOLUTIONS` in components/KiraBranding.tsx, which carries `'use client'` and React.
// Importing that file from a server API route pulls the whole client component graph into the
// route's module graph — and it does not fail, it just gets slow: the billing integration suite went
// from 19 seconds to a 45-second timeout with all seven tests skipped, which reads exactly like the
// known Stripe network flake and is not one. Verified by removing the import and watching it pass.
//
// So the value lives here and the component imports IT, rather than the other way round.
//
// ⚠️ AND IT MUST BE A MAILBOX SOMEBODY READS. `hello@corporateaisolutions.com` was already found and
// removed once, from the introducer expiry page — under the words "a human will sort it out", on the
// one screen a person reaches only because they are already locked out. An address that bounces
// there costs the reader their last attempt and makes the offer of help decorative.

export const SUPPORT_EMAIL = 'dennis@corporateaisolutions.com';
