// app/talk/page.tsx
// One-tap deep link to the mic. Resolves the signed-in owner's primary Kira and jumps straight into
// the coach — so "Talk to Kira" is always ONE action away (no dashboard → find → open → tap). This is
// the target of the persistent TalkFab and the installed PWA's start_url.

import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import ChatPage from '@/app/chat/[agentId]/page';

export const dynamic = 'force-dynamic';

export default async function TalkPage() {
  const appUser = await getCurrentAppUser();
  if (!appUser) redirect('/login?next=/talk');

  const svc = createServiceClient();

  // A BUSINESS KIRA WINS, ALWAYS — even over a more recently used personal one.
  //
  // This used to take the most-recently-used active agent of any kind, while /dashboard picked
  // `journey_type === 'business'` first. The two disagreed, and the disagreement was not academic:
  // an owner whose account still held an old personal-journey agent was handed it by /talk, and a
  // personal Kira carries six memory tools and NONE of the business ones — no email, no Drive, no
  // contacts.
  //
  // What that looks like from his side is the product denying it can do the things he is paying for.
  // Observed 2026-08-05: she opened "Hey Tom" (a stale first_message from someone else's walkthrough),
  // then told the owner, correctly for that agent and disastrously for him, that she had no
  // connection to his Gmail, his Drive or his Xero. She then distilled that denial into his memory
  // as a fact about his business, where it would have been recalled and repeated indefinitely.
  //
  // Ordering, not filtering: an owner who genuinely only has a personal Kira should still reach it.
  const { data: agents } = await svc
    .from('kira_agents')
    .select('elevenlabs_agent_id, journey_type')
    .eq('user_id', appUser.id)
    .eq('status', 'active')
    .order('last_conversation_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const list = agents ?? [];
  const agent = list.find((a) => a.journey_type === 'business') ?? list[0];

  // RENDERED HERE, not redirected to /chat/<agent id>.
  //
  // A naive tester signed in and landed on "/chat/agent_7601kyxn82n6fh8t9rb9bh6kwfh2": "I know that
  // doesn't matter. It still looks like something has gone wrong." He is exactly the buyer who reads
  // the address bar, and a wall of machine identifier on the first screen of a product he is
  // deciding whether to trust reads as an error even when nothing is wrong.
  //
  // /talk was already the canonical entry — the FAB target and the PWA start_url — and only
  // redirected because the component needed a route param to find its agent. It takes one as a prop
  // now, so he stays on an address that means something. /chat/<id> is untouched: links already sent
  // and anything bookmarked resolve exactly as before.
  if (agent?.elevenlabs_agent_id) {
    return <ChatPage agentId={agent.elevenlabs_agent_id as string} />;
  }
  // NO KIRA YET — send him to the flow that MAKES her, which is what he asked for.
  //
  // HISTORY, because this line has now been wrong in both directions. It once jumped straight to
  // `/start`, which put a brand-new owner's first ever screen on a bare "choose a journey" page with
  // no nav and no context. That was fixed by sending him to `/dashboard` instead — and that fix
  // created the defect below, which is worse, because it is silent.
  //
  // WHAT RAY HIT (6 August 2026). Every "Talk to Kira" control in the product points HERE: the
  // floating button on every authenticated page, the My Genome empty state, the Knowledge link. On a
  // brand-new account there is no `kira_agents` row, so all of them landed him back on the dashboard
  // he had just left — no message, no error, no explanation. Verified three ways in his walkthrough.
  //
  //   "I've made an account, I'm on the screen, and the button that says 'talk to her' reloads the
  //    page. I'd assume it's broken, and I'd assume the rest is too."
  //
  // The product's core action doing nothing on day one is the whole finding. And the underlying
  // cause is real and bigger than this line: a new owner HAS no agent, because agents are only ever
  // created by POST /api/kira/create from the draft-approval flow, and `ensureUserAgent` — the
  // canonical one-agent-per-user orchestration in @caistech/elevenlabs-convai, which exists exactly
  // so this is not hand-rolled — is called nowhere in this repo. Provisioning on demand is the
  // deeper fix and it is NOT this change: it creates a real vendor resource on a page load, and it
  // cannot be verified from here.
  //
  // What this change does is stop the dead end and match what the rest of the product already does.
  // `/dashboard` computes exactly this: `talkHref = businessAgent ? /chat/<id> : '/start?journey=business'`.
  // So the dashboard's own Talk buttons already lead somewhere that works while `/talk` did not —
  // one product, two answers, and the FAB was on the losing one. `?journey=business` is what avoids
  // the bare journey-picker the earlier fix was right to complain about.
  //
  // Fixing it HERE rather than in TalkFab is deliberate: the FAB, My Genome and Knowledge all point
  // at `/talk`, so this is one change instead of three, and the next surface that adds a Talk link
  // inherits the correct behaviour instead of having to remember.
  //
  // ── UPDATED 2026-08-12: THE DESTINATION MOVED BACK TO /dashboard, AND THAT IS NOT A REVERT ──
  //
  // Everything above was right when it was written. What has changed underneath it is that
  // `/dashboard` no longer dead-ends: since 2026-08-10 it forwards an account with NO AGENT AND NO
  // VALUATION straight into `/start?journey=business&from=app`. So the silent bounce Ray reported —
  // the Talk button returning him to the page he was already on — cannot happen for the owner who
  // reported it, because the dashboard now carries him onward.
  //
  // Sending everyone to /start regardless is what broke, and it broke for the opposite person: an
  // owner who HAS a saved valuation. He signs in, `login` sets `next=/talk`, this line fires, and he
  // is dropped into a setup flow having never seen the gap figure he came back for. The dashboard
  // redirect is deliberately scoped to spare exactly him — "a gap figure someone came for isn't
  // snatched away" — and routing round the dashboard defeats that scoping entirely.
  //
  // So the decision of where an agent-less owner belongs is made in ONE place, by the surface that
  // knows what else he has. Here we only say "you have no agent, go home"; /dashboard decides
  // whether home is a gap figure with a Meet-Kira CTA, or the setup flow.
  //
  // Terminates: /dashboard only forwards when there is no valuation either, and /start never routes
  // back. Empty account: /talk → /dashboard → /start. Valuation holder: /talk → /dashboard, stop.
  //
  // ⚠️ It also restores what `app/login/page.tsx` has claimed in a comment all along — that a new
  // owner "falls through to /dashboard, which carries the right empty state for him (saved
  // valuation, the eleven questions)". That comment described behaviour this file did not implement,
  // and the two disagreed for six days. Reported by the operator, 2026-08-12.
  redirect('/dashboard');
}
