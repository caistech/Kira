// app/api/admin/exec/reprovision/route.ts
// One-shot #12 live rollout: push the fractional-exec persona + doing-slice tools onto existing
// BUSINESS agents. Admin-gated (ADMIN_EMAILS). Dry-run by default; POST ?apply=true to execute.
//
//   GET  /api/admin/exec/reprovision           → what WOULD change (dry run)
//   POST /api/admin/exec/reprovision?apply=true → apply it
//
// Idempotent: agents already on the exec persona keep it; tool re-attach is safe to repeat.

import { isCurrentUserAdmin } from '@/lib/auth';
import { reprovisionBusinessAgentsForExec } from '@/lib/admin/exec-reprovision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function run(apply: boolean): Promise<Response> {
  if (!(await isCurrentUserAdmin())) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const result = await reprovisionBusinessAgentsForExec({ apply });
    return new Response(JSON.stringify({ applied: apply, ...result }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET() {
  return run(false); // dry run
}

export async function POST(req: Request) {
  const apply = new URL(req.url).searchParams.get('apply') === 'true';
  return run(apply);
}
