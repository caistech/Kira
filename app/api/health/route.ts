// app/api/health/route.ts
// Lightweight liveness endpoint for the portfolio-gate route smoke test (R13) and uptime probes.
// No auth, no DB, no secrets — just confirms the app is serving. Kept static/cheap on purpose.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ ok: true, service: 'kira' }, { status: 200 });
}
