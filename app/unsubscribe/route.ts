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

import { senderIdentityOrNull } from '@/lib/email/sender';
import { suppressionStore, unsubscribeSecret } from '@/lib/email/suppressions';
import { createServiceClientV2 } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kira-rho.vercel.app';

const route = createUnsubscribeRoute({
  get secret() {
    return unsubscribeSecret();
  },
  store: suppressionStore(),
  brandName: 'Kira',
  // The page is reached from an email, by someone mildly annoyed, and asks them to confirm an
  // action — the shape of a phishing page. Unbranded, it read as one: "my first thought is
  // phishing and my second is I'll mark it as spam" (naive-tester, production, 2026-07-26), which
  // costs more deliverability than the unsubscribe does. So it identifies itself the way the email
  // did — same avatar, same accent, the operating entity, and a way back.
  brand: {
    logoUrl: `${APP_URL}/female_avatar.jpeg`,
    homeUrl: APP_URL,
    accent: '#db2777',
    supportEmail: 'dennis@corporateaisolutions.com',
  },
  sender: senderIdentityOrNull(),
  // Mirror the opt-out onto the account so Settings reflects reality rather than contradicting it.
  // The suppression list is the authority; this keeps the UI honest. Never blocks the response.
  onUnsubscribed: async (email) => {
    await createServiceClientV2()
      .from('users')
      .update({ email_notifications_opt_in: false })
      .eq('email', email);
  },
});

export const GET = route.GET;
export const POST = route.POST;
