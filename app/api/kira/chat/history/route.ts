// app/api/kira/chat/history/route.ts
// The transcript he came back to read.
//
// WHY THIS EXISTS. The typed conversation was held in `useState` on the chat page and nowhere else,
// so navigating away and back showed "Ready when you are" and an empty box. The messages were never
// lost — `conversation_messages` has them, written by both transports — but nothing read them.
//
// Ray, walking production 2026-08-16: "The transcript was gone. Blank page, 'Ready when you are'.
// Meanwhile the voice panel beside it says 'Welcome back — Kira remembers where you left off'. She
// does remember… but I can't see any of it. For a man being asked to pour thirty-five years into
// this thing, 'where did what I said go?' is not a small question."
//
// ⚠️ IT IS THE RECEIPT, NOT THE MEMORY. Her recall runs off distilled facts (`kira_memory`) and is
// unaffected by this. What was missing is the thing he scrolls back through at night wondering
// whether he told her about the retentions.

import { NextResponse } from 'next/server';

import { getCurrentAppUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { KIRA_CONVAI_TABLES } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * How far back to read.
 *
 * Enough that yesterday's conversation is there, small enough that a page load is not a download.
 * He is reading, not auditing — the full record is the Genome and the handover document.
 */
const LIMIT = 100;

export async function GET(request: Request) {
  // ⚠️ IDENTITY FROM THE SESSION, NEVER FROM THE QUERY STRING. This returns a man's own words about
  // selling his business; a `?userId=` here would hand them to anyone who guessed a uuid.
  const user = await getCurrentAppUser();
  if (!user?.id) return NextResponse.json({ messages: [] }, { status: 200 });

  const agentId = new URL(request.url).searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ messages: [] });

  const supabase = createServiceClient();

  // The agent must belong to HIM. Scoped as a filter rather than checked afterwards, so there is no
  // path where another owner's row is even fetched.
  const { data: agent } = await supabase
    .from(KIRA_CONVAI_TABLES.agents)
    .select('id')
    .eq('elevenlabs_agent_id', agentId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!agent) return NextResponse.json({ messages: [] });

  const { data, error } = await supabase
    .from(KIRA_CONVAI_TABLES.messages)
    .select('role, content, created_at')
    .eq('user_id', user.id)
    .eq('kira_agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    // Degrade to an empty transcript rather than an error page. He can still talk to her, which is
    // the thing he came for; a missing receipt is a smaller loss than a broken screen.
    console.error('[chat/history] could not read the transcript:', error);
    return NextResponse.json({ messages: [] });
  }

  // Read newest-first for the LIMIT to mean "the most recent hundred", then reversed so the caller
  // renders oldest-first. Taking the oldest hundred would show him the start of a long history and
  // hide the conversation he just had.
  const messages = (data ?? [])
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', text: String(m.content ?? '') }))
    .filter((m) => m.text.trim() && (m.role === 'user' || m.role === 'assistant'));

  return NextResponse.json({ messages });
}
