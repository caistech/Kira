// app/unsubscribe/route.ts
//
// The opt-out endpoint. Four lines of Kira, because the shape is canonical
// (@caistech/email-compliance) — signed token, confirm-then-act, durable suppression, neutral
// response to a bad token. Every product in the portfolio mounts the same thing rather than
// inventing a fourth variant.
//
// GET shows a confirmation; POST does it. A bare GET deliberately does NOT unsubscribe: mail
// clients and security scanners pre-fetch links, and a GET that mutates state gets triggered by a
// scanner nobody asked, silently opting people out.

import { createUnsubscribeRoute } from '@caistech/email-compliance';

import { suppressionStore, unsubscribeSecret } from '@/lib/email/suppressions';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const route = createUnsubscribeRoute({
  get secret() {
    return unsubscribeSecret();
  },
  store: suppressionStore(),
  brandName: 'Kira',
  // Mirror the opt-out onto the account so Settings reflects reality rather than contradicting it.
  // The suppression list is the authority; this keeps the UI honest. Never blocks the response.
  onUnsubscribed: async (email) => {
    await createServiceClient()
      .from('users')
      .update({ email_notifications_opt_in: false })
      .eq('email', email);
  },
});

export const GET = route.GET;
export const POST = route.POST;
