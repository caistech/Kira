// POST /api/valuation/match-industry — the LLM backstop for the industry matcher.
//
// ORDER MATTERS, and the mechanical layers run FIRST (client-side, in lookupSdeMultiple): exact
// name → Australian synonym table → loose substring. Those are instant, free and deterministic, and
// they cover the trades this ICP actually runs. This route exists only for what falls through — the
// long tail nobody can enumerate ("alpaca stud farm", "mobile coolroom hire").
//
// WHY IT IS A ROUTE AND NOT A CLIENT CALL. The model key is server-only, and a per-keystroke model
// call at question one would add latency and cost to the first thing an owner touches. The client
// calls this once, on blur, and only after the mechanical layers have missed.
//
// CACHED IN THE DATABASE, keyed by the normalised phrase. The second owner to type "alpaca stud
// farm" costs nothing, and the mapping becomes inspectable — a bad match can be found and corrected
// rather than being re-invented per visitor. The cache is also the backlog: the phrases in it are
// exactly the synonyms the table is missing.
//
// DEGRADES HONESTLY. No key, a model error, or a sector name the model invented all return
// matched:false, which surfaces as the existing "no sector match — using the market average" copy.
// It never guesses a multiple.

import { NextResponse } from 'next/server';
import { SECTOR_MULTIPLES } from '@/lib/valuation/sde-multiples';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const normalise = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export async function POST(request: Request) {
  let industry = '';
  try {
    const body = await request.json();
    industry = String(body?.industry ?? '').slice(0, 120);
  } catch {
    return NextResponse.json({ matched: false }, { status: 400 });
  }

  const q = normalise(industry);
  if (!q || q.length < 3) return NextResponse.json({ matched: false });

  const supabase = createServiceClient();

  // 1. Cache. Cheap, and it makes a wrong mapping fixable in one row rather than in a prompt.
  const { data: cached } = await supabase
    .from('industry_match_cache')
    .select('sector, matched')
    .eq('query', q)
    .maybeSingle();
  if (cached) {
    return NextResponse.json({ matched: cached.matched, sector: cached.sector ?? undefined, source: 'cache' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ matched: false });

  const names = SECTOR_MULTIPLES.map((s) => s.name);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You map an Australian small business description to the closest sector from a fixed list. ' +
              'The list is US-worded; the input is how an Australian owner describes their trade. ' +
              'Reply with ONLY the exact sector name from the list, or the single word NONE. ' +
              'Answer NONE when nothing is a genuinely close fit — a wrong sector changes the ' +
              'business valuation, so NONE is better than a guess.\n\nList:\n' + names.join('\n'),
          },
          { role: 'user', content: industry },
        ],
      }),
    });
    if (!res.ok) return NextResponse.json({ matched: false });

    const json = await res.json();
    const answer = String(json?.choices?.[0]?.message?.content ?? '').trim();

    // Only accept a name that is actually in the list. A model returning something plausible but
    // absent must not become a sector — that is how a fabricated multiple gets into a valuation.
    const sector = names.find((n) => n.toLowerCase() === answer.toLowerCase()) ?? null;

    await supabase.from('industry_match_cache').upsert(
      { query: q, raw_input: industry, sector, matched: !!sector, source: 'llm' },
      { onConflict: 'query' },
    );

    return NextResponse.json({ matched: !!sector, sector: sector ?? undefined, source: 'llm' });
  } catch {
    return NextResponse.json({ matched: false });
  }
}
