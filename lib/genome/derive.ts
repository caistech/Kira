// Turning what Kira remembers into the owner's Genome.
//
// THE HONEST PROBLEM THIS SOLVES, stated plainly because it shapes everything below: `kira_memory`
// holds CONVERSATIONAL memory — context, goal, preference, decision — with free-form topic tags.
// That is the right shape for recall ("what did he tell me last time") and the wrong shape for a
// Genome, which is organised by the questions a buyer's advisor asks. Nothing in the product
// currently captures Genome-SHAPED knowledge directly.
//
// So this derives one from what we actually have, and is careful not to overstate it. An owner
// paying $999/month is entitled to see what we hold; he is not entitled to be told it is more
// organised than it is. Sections with nothing in them say so.
//
// Classification is cached on the row (kira_memory.genome_section) so opening your own Genome is
// instant and free, and a wrong call is fixable in a row rather than re-argued with a prompt.

import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';

export const GENOME_SECTIONS = [
  { key: 'work-in', title: 'How work comes in', question: 'Where does revenue come from, and does it depend on you?' },
  { key: 'pricing', title: 'How work is priced and quoted', question: 'Could someone else quote a job and reach your number?' },
  { key: 'delivery', title: 'How the work gets done', question: 'Does the business run when you are not on site?' },
  { key: 'suppliers', title: 'Suppliers and terms', question: 'What do your costs depend on, and are those terms portable?' },
  { key: 'obligations', title: 'Licences, insurance and the calendar', question: 'What must not lapse, and who is watching it?' },
  { key: 'only-you', title: 'Things only you know', question: 'What walks out the door with you?' },
] as const;

export type SectionKey = (typeof GENOME_SECTIONS)[number]['key'];

export interface OwnerEntry {
  id: string;
  content: string;
  capturedAt: string;
  importance: number | null;
  section: SectionKey | 'unsorted';
  /**
   * Where this came from — the conversation he said it in.
   *
   * This is the difference between a handover document and a list of assertions. "The pricing rule
   * is X" is a claim a buyer's accountant discounts; "the owner stated on 3 March that the pricing
   * rule is X" is evidence they can put in a file. Null where the source could not be resolved,
   * and shown as unsourced rather than quietly presented as if it were sourced.
   */
  source: { conversationId: string; spokenOn: string } | null;
}

export interface OwnerSection {
  key: SectionKey;
  title: string;
  question: string;
  entries: OwnerEntry[];
}

export interface OwnerGenome {
  sections: OwnerSection[];
  unsorted: OwnerEntry[];
  totalCaptured: number;
  documents: number;
  /** 0–1 from the valuation, or null when they have not run one. */
  readiness: number | null;
  gap: number | null;
  worthToday: number | null;
  /** True when nothing has been captured — the empty state must be honest, not decorative. */
  empty: boolean;
  /** How many entries can be traced to a conversation. Stated plainly; a buyer will ask. */
  sourced: number;
}

const SECTION_KEYS = GENOME_SECTIONS.map((s) => s.key) as string[];

const CLASSIFY_SYSTEM = `
You file a note an assistant recorded about a small business into ONE section of that business's
operating manual. Reply with ONLY the section key.

work-in      how work/revenue arrives: clients, referrals, contracts, marketing, who brings the work
pricing      how anything is priced, quoted, discounted, or what it costs the customer
delivery     how the work actually gets done: crews, scheduling, process, who does what, quality
suppliers    suppliers, purchasing, materials, subcontractors, trade terms
obligations  licences, insurance, compliance, registrations, renewals, deadlines
only-you     judgement, history, relationships or rules that live only in the owner's head
none         anything that is not about how this business operates (chit-chat, app preferences, meta)

Answer "none" freely. A note filed into the wrong section is worse than one left out, because the
owner will read it there and conclude we did not understand him.
`.trim();

/**
 * Classify any unclassified memories for this owner, then read the Genome back.
 *
 * Batched and capped: an owner with hundreds of memories gets the most important ones filed first
 * rather than a slow page. The rest fill in on later visits.
 */
export async function deriveOwnerGenome(userId: string, opts: { classifyLimit?: number } = {}): Promise<OwnerGenome> {
  const supabase = createServiceClient();
  const classifyLimit = opts.classifyLimit ?? 25;
  const apiKey = process.env.OPENAI_API_KEY;

  const { data: pending } = await supabase
    .from('kira_memory')
    .select('id, content')
    .eq('user_id', userId)
    .is('genome_section', null)
    .neq('active', false)
    .order('importance', { ascending: false, nullsFirst: false })
    .limit(classifyLimit);

  if (apiKey && pending?.length) {
    await Promise.all(
      pending.map(async (m) => {
        const section = await classifyOne(apiKey, String(m.content ?? ''));
        await supabase
          .from('kira_memory')
          .update({ genome_section: section, genome_classified_at: new Date().toISOString() })
          .eq('id', m.id);
      }),
    );
  }

  const { data: rows } = await supabase
    .from('kira_memory')
    .select('id, content, created_at, importance, genome_section, source_conversation_id')
    .eq('user_id', userId)
    .neq('active', false)
    .order('created_at', { ascending: false });

  // The conversation each fact came from. One extra round trip rather than a join, so a missing or
  // deleted conversation degrades that entry to unsourced instead of dropping the fact itself.
  const sourceIds = [...new Set((rows ?? []).map((r) => r.source_conversation_id).filter(Boolean))];
  const spokenOn = new Map<string, string>();
  if (sourceIds.length > 0) {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, started_at')
      .in('id', sourceIds as string[]);
    for (const c of convs ?? []) spokenOn.set(String(c.id), String(c.started_at));
  }

  const { data: valuation } = await supabase
    .from('business_valuations')
    .select('readiness, gap, worth_today')
    .eq('user_id', userId)
    .maybeSingle();

  const { count: documents } = await supabase
    .from('kira_knowledge')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  const all: OwnerEntry[] = (rows ?? [])
    // 'none' is filed away rather than shown: it is real memory, but it is not about how the
    // business operates, and padding a Genome with chit-chat is how it stops being believable.
    .filter((r) => r.genome_section !== 'none')
    .map((r) => ({
      id: String(r.id),
      content: String(r.content ?? ''),
      capturedAt: String(r.created_at),
      importance: (r.importance as number) ?? null,
      section: (SECTION_KEYS.includes(String(r.genome_section)) ? r.genome_section : 'unsorted') as SectionKey | 'unsorted',
      source:
        r.source_conversation_id && spokenOn.has(String(r.source_conversation_id))
          ? {
              conversationId: String(r.source_conversation_id),
              spokenOn: spokenOn.get(String(r.source_conversation_id)) as string,
            }
          : null,
    }));

  const sections: OwnerSection[] = GENOME_SECTIONS.map((s) => ({
    key: s.key,
    title: s.title,
    question: s.question,
    entries: all.filter((e) => e.section === s.key),
  }));

  return {
    sections,
    unsorted: all.filter((e) => e.section === 'unsorted'),
    totalCaptured: all.length,
    documents: documents ?? 0,
    readiness: valuation?.readiness != null ? Number(valuation.readiness) : null,
    gap: valuation?.gap != null ? Number(valuation.gap) : null,
    worthToday: valuation?.worth_today != null ? Number(valuation.worth_today) : null,
    empty: all.length === 0,
    sourced: all.filter((e) => e.source).length,
  };
}

async function classifyOne(apiKey: string, content: string): Promise<string> {
  if (!content.trim()) return 'none';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0,
        max_tokens: 8,
        messages: [
          { role: 'system', content: CLASSIFY_SYSTEM },
          { role: 'user', content: content.slice(0, 900) },
        ],
      }),
    });
    if (!res.ok) return 'none';
    const json = await res.json();
    const answer = String(json?.choices?.[0]?.message?.content ?? '').trim().toLowerCase();
    return SECTION_KEYS.includes(answer) || answer === 'none' ? answer : 'none';
  } catch {
    // Leave it unclassified rather than guessing — the UI shows unsorted, which is true.
    return 'none';
  }
}
