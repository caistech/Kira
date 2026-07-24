// app/talk/page.tsx
// One-tap deep link to the mic. Resolves the signed-in owner's primary Kira and jumps straight into
// the coach — so "Talk to Kira" is always ONE action away (no dashboard → find → open → tap). This is
// the target of the persistent TalkFab and the installed PWA's start_url.

import { redirect } from 'next/navigation';
import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

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

  if (agent?.elevenlabs_agent_id) {
    redirect(`/chat/${agent.elevenlabs_agent_id}`);
  }
  // No Kira yet — send them to create one.
  redirect('/start');
}
