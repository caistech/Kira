```ts
// app/api/beta/peek/route.ts
//
// "Is this code good, and whose is it?" — asked before a password is chosen,
// so the tester sees the account he is about to create.
//
// ⚠️ THIS DOES NOT CONSUME THE CODE.
// Checking and claiming are separate on purpose.
//
// ⚠️ IT RETURNS AN EMAIL ADDRESS.
// The caller must already hold a valid invitation code.
//
// Every rejection answers the same sentence, so this cannot be used to learn
// which codes exist. The real reason is logged for an operator.

import { NextRequest, NextResponse } from 'next/server';

import {
  BETA_CODE_REJECTION_MESSAGE,
  peekBetaCode,
} from '@/lib/billing/beta-codes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REJECTION_MESSAGE = BETA_CODE_REJECTION_MESSAGE;

async function handlePeek(code: string) {
  if (!code.trim()) {
    return NextResponse.json({
      ok: false,
      error: 'Enter your invitation code.',
    });
  }

  const result = await peekBetaCode(code);

  if (!result.ok) {
    console.warn(
      `[api/beta/peek] rejected a code: reason=${result.reason}`,
    );

    // Deliberately return 200.
    // The `ok` flag is the application-level contract.
    return NextResponse.json({
      ok: false,
      error: REJECTION_MESSAGE,
    });
  }

  return NextResponse.json({
    ok: true,
    email: result.email,
  });
}

/**
 * POST /api/beta/peek
 *
 * Primary API contract used by BetaRedeem.
 *
 * Expected body:
 * {
 *   "code": "ABC123..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        ok: false,
        error: 'Enter your invitation code.',
      });
    }

    const code =
      typeof body === 'object' &&
      body !== null &&
      'code' in body &&
      typeof body.code === 'string'
        ? body.code
        : '';

    return handlePeek(code);
  } catch (error) {
    console.error('[api/beta/peek][POST] unexpected error:', error);

    return NextResponse.json({
      ok: false,
      error: REJECTION_MESSAGE,
    });
  }
}

/**
 * GET /api/beta/peek?code=...
 *
 * Retained for compatibility / direct browser testing.
 *
 * POST is the preferred application contract.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code') ?? '';

    return handlePeek(code);
  } catch (error) {
    console.error('[api/beta/peek][GET] unexpected error:', error);

    return NextResponse.json({
      ok: false,
      error: REJECTION_MESSAGE,
    });
  }
}
```
