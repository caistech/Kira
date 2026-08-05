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
  // NO KIRA YET — the dashboard, not the create flow.
  //
  // This used to jump straight to /start, which meant a brand-new owner's first ever screen was a
  // bare "choose a journey" page: no nav, no context, nothing telling him where he was or what had
  // happened to the thing he had just paid for. /dashboard is the home screen and already has the
  // right empty state for exactly this person — the saved-valuation carry-over, the eleven
  // questions, and a "You haven't met Kira yet" card that offers the conversation.
  //
  // It matters most on the PWA, because /talk is the manifest's start_url: tapping the home-screen
  // icon before an agent exists took him somewhere with no way back.
  redirect('/dashboard');
}
