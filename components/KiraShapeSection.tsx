// components/KiraShapeSection.tsx
//
// The Kira shape, ready to drop onto any authenticated page: <KiraShapeSection surface="drafts" />.
//
// A server component that answers the one question the shape needs — which agent is his — and hands
// it to the client component that renders her. Five pages needed the same three queries; doing it
// here means a page adds Kira in one line and cannot get the lookup subtly different from its
// neighbours.
//
// ⚠️ WHY THE SHAPE IS ON THESE PAGES AT ALL, since it is the whole point. Before 2026-08-18 not one
// authenticated page in this product had Kira on it. She lived at /chat, /start and
// /business-valuation — none of which are in the nav — so on every page an owner actually works in,
// she was either a sentence pointing elsewhere or a floating pill in the corner. That pill was
// carrying six pages by itself, which is why removing it looked like the product losing its voice:
// it was the only thing standing in for a surface that had never been placed.
//
// Talking to her IS the product. She belongs on the page, not behind a link to one.

import { getCurrentAppUser, getCurrentOrganisationContext } from '@/lib/auth';
import { createServiceClientV2 } from '@/lib/supabase/server';
import { KiraShape } from '@/components/KiraShape';
import type { VoiceSurface } from '@/lib/voice/connect-telemetry';

export async function KiraShapeSection({
  surface,
  firstMessage,
}: {
  surface: VoiceSurface;
  /**
   * An opener the PAGE supplies, when it knows something worth opening on — /my-genome passes the
   * areas a buyer would ask about that she knows nothing about yet. Optional everywhere else, where
   * the agent's own greeting and its connect-time recall are the right default.
   */
  firstMessage?: string;
}) {
  // INV-020: agents and conversations are organisation-owned — resolve the org first and scope the
  // lookups by organisation_id. getCurrentAppUser is retained only for the person's first name
  // (provenance/actor); ownership never comes from the legacy user row.
  const organisationContext = await getCurrentOrganisationContext();
  if (!organisationContext) return null;

  const user = await getCurrentAppUser();

  const svc = createServiceClientV2();
  const { data: agents } = await svc
    .from('kira_agents')
    .select('id, elevenlabs_agent_id, journey_type, status')
    .eq('organisation_id', organisationContext.organisationId)
    .neq('status', 'deleted');

  const businessAgent =
    (agents ?? []).find((a) => a.journey_type === 'business' && a.status === 'active') ?? (agents ?? [])[0];
  const agentId = (businessAgent?.elevenlabs_agent_id as string | undefined) ?? null;

  // ⚠️ THE COUNT IS DERIVED, NOT READ OFF kira_agents.total_conversations — that column is read in
  // three places and incremented in none, so it sits at 0 forever. An owner with a real history was
  // shown "0 conversations" beside a transcript he had just had.
  let hasHistory = false;
  if (businessAgent?.id) {
    const { count } = await svc
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', organisationContext.organisationId)
      .eq('kira_agent_id', businessAgent.id);
    hasHistory = (count ?? 0) > 0;
  }

  return (
    <KiraShape
      agentId={agentId}
      surface={surface}
      firstMessage={firstMessage}
      firstName={(user as { first_name?: string } | null)?.first_name}
      // ⚠️ ONLY WHEN THERE IS SOMETHING TO PICK UP. "Kira remembers where you left off" told to a man
      // with no history is the cheapest possible way to lose him: the claim is checkable, he checks
      // it, and it is false on the first screen he ever sees.
      welcomeBack={
        hasHistory ? 'Welcome back — Kira remembers where you left off. Tap the mic to carry on.' : undefined
      }
    />
  );
}
