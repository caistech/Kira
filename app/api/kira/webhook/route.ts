// app/api/kira/webhook/route.ts
import { kiraConvaiRoutes } from '@/lib/kira/convai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Log incoming request details
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Read the body once and store it
  const body = await req.json();
  console.log('Body:', body);

  // Fail CLOSED: the canonical postCall handler only verifies the HMAC when postCallSecret is
  // truthy (`if (postCallSecret) {…}`), so an unset ELEVENLABS_WEBHOOK_SECRET would silently
  // accept forged, unsigned transcripts. Reject before delegating rather than process unverified.
  if (!process.env.ELEVENLABS_WEBHOOK_SECRET) {
    return new Response('Post-call webhook not configured (ELEVENLABS_WEBHOOK_SECRET unset)', {
      status: 503,
    });
  }

  // Verify CONVAI_TOOL_SECRET as well
  if (!process.env.CONVAI_TOOL_SECRET) {
    return new Response('Post-call webhook not configured (CONVAI_TOOL_SECRET unset)', {
      status: 503,
    });
  }

  // Create a new Request object with the body
  const newReq = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: JSON.stringify(body)
  });

  return kiraConvaiRoutes().postCall(newReq);
}