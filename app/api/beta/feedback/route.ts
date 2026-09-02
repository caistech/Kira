import { createServiceClientV2 } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tester_id, cohort, workflow, rating, category, description, expected, actual, reproducible, severity, metadata } = body;

    if (!tester_id || !description) {
      return NextResponse.json({ error: 'tester_id and description are required' }, { status: 400 });
    }

    const supabase = createServiceClientV2();
    const { data, error } = await supabase
      .from('kira_feedback')
      .insert({
        tester_id,
        cohort,
        workflow,
        rating,
        category,
        description,
        expected,
        actual,
        reproducible,
        severity,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('[beta/feedback] insert error:', error);
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (e) {
    console.error('[beta/feedback] unexpected error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}