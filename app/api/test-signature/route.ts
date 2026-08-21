import crypto from 'crypto';

export async function POST(req: Request) {
  const body = await req.json();
  const bodyString = JSON.stringify(body);

  // Generate signature
  const hmac = crypto.createHmac('sha256', process.env.ELEVENLABS_WEBHOOK_SECRET);
  hmac.update(bodyString);
  const signature = hmac.digest('base64');

  return new Response(JSON.stringify({
    signature,
    secret: process.env.ELEVENLABS_WEBHOOK_SECRET,
    body: bodyString
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}