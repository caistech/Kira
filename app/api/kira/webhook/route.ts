// app/api/kira/webhook/route.ts
import { kiraConvaiRoutes } from '@/lib/kira/convai';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // Read the raw body once
    const rawBody = await req.text();

    // Verify required headers exist
    const signature = req.headers.get('X-ElevenLabs-Signature');
    const convaiSecret = req.headers.get('X-ConvAI-Tool-Secret');

    if (!signature || !convaiSecret) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required headers',
        missingHeaders: {
          'X-ElevenLabs-Signature': !signature,
          'X-ConvAI-Tool-Secret': !convaiSecret
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Debug logging - show the exact secret being used
    console.log('=== Webhook Request Debug ===');
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    console.log('Raw Body:', rawBody);
    console.log('Received Signature:', signature);
    console.log('ELEVENLABS_WEBHOOK_SECRET:', process.env.ELEVENLABS_WEBHOOK_SECRET);
    console.log('CONVAI_TOOL_SECRET:', process.env.CONVAI_TOOL_SECRET);
    console.log('ConvAI Secret Match:', convaiSecret === process.env.CONVAI_TOOL_SECRET);

    // Verify CONVAI_TOOL_SECRET matches first
    if (convaiSecret !== process.env.CONVAI_TOOL_SECRET) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid ConvAI tool secret',
        received: convaiSecret,
        expected: process.env.CONVAI_TOOL_SECRET
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the signature
    const hmac = crypto.createHmac('sha256', process.env.ELEVENLABS_WEBHOOK_SECRET);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest('base64');

    console.log('Expected Signature:', expectedSignature);
    console.log('Signature Match:', signature === expectedSignature);
    console.log('===========================');

    // Verify signatures match
    if (signature !== expectedSignature) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid signature',
        received: signature,
        expected: expectedSignature,
        rawBody: rawBody,
        secretUsed: process.env.ELEVENLABS_WEBHOOK_SECRET,
        bodyLength: rawBody.length,
        secretLength: process.env.ELEVENLABS_WEBHOOK_SECRET.length,
        bodyChars: rawBody.split('').map(c => c.charCodeAt(0)),
        secretChars: process.env.ELEVENLABS_WEBHOOK_SECRET.split('').map(c => c.charCodeAt(0))
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create a new Request object with the raw body
    const newReq = new Request(req.url, {
      method: req.method,
      headers: req.headers,
      body: rawBody
    });

    // Clone the request before passing to postCall
    const clonedReq = newReq.clone();

    console.log('=== Before postCall ===');
    console.log('Request URL:', clonedReq.url);
    console.log('Request Method:', clonedReq.method);
    console.log('Request Headers:', Object.fromEntries(clonedReq.headers.entries()));
    console.log('Request Body:', await clonedReq.text());
    console.log('=======================');

    const response = await kiraConvaiRoutes().postCall(clonedReq);

    console.log('=== After postCall ===');
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response Body:', await response.text());
    console.log('=======================');

    return response;
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}