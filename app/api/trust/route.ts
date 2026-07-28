// GET /api/trust — the adviser one-pager, as a downloadable file she can forward or file.
//
// A download rather than only a web page, because the person who actually needs to read it is
// usually not the adviser: it is her compliance officer, her principal, or her own solicitor. A URL
// gets skimmed and lost; an attachment gets filed against the client. Public and unauthenticated on
// purpose — she is evaluating us before she has an account, and putting an assurance document
// behind a signup is the same as not having one.

import { trustOnePager } from '@/lib/trust';

export const runtime = 'nodejs';

export function GET() {
  return new Response(trustOnePager(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="kira-adviser-briefing.md"',
      // Content changes only when the file does; a stale copy would misstate a compliance answer.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
