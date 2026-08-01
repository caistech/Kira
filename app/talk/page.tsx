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
  // The owner's most-recently-used active Kira (fall back to most-recently created).
  const { data: agent } = await svc
    .from('kira_agents')
    .select('elevenlabs_agent_id')
    .eq('user_id', appUser.id)
    .eq('status', 'active')
    .order('last_conversation_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

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
  // No Kira yet — send them to create one.
  redirect('/start');
}
