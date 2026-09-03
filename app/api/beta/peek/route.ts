import { NextRequest, NextResponse } from 'next/server';

import {
  BETA_CODE_REJECTION_MESSAGE,
  peekBetaCode,
} from '@/lib/billing/beta-codes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REJECTION_MESSAGE = BETA_CODE_REJECTION_MESSAGE;

type PeekRequestBody = {
  code?: unknown;
};

function normaliseCode(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Read-only beta invitation validation.
 *
 * This route NEVER:
 *   - consumes the invitation;
 *   - creates Auth;
 *   - creates Person;
 *   - creates Organisation;
 *   - creates Membership;
 *   - creates Ownership.
 *
 * The beta invitation is access/provenance information only.
 *
 * Response contract:
 *   { ok: true, email: string }
 *   { ok: false, error: string, code: string }
 */
async function handlePeek(code: string) {
  const normalisedCode = code.trim();

  if (!normalisedCode) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Enter your invitation code.',
        code: 'CODE_REQUIRED',
      },
      { status: 400 },
    );
  }

  try {
    const result = await peekBetaCode(normalisedCode);

    if (!result.ok) {
      console.warn(
        `[api/beta/peek] rejected beta code: reason=${result.reason}`,
      );

      return NextResponse.json(
        {
          ok: false,
          error: REJECTION_MESSAGE,
          code: 'BETA_CODE_REJECTED',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      email: result.email.toLowerCase(),
    });
  } catch (error) {
    console.error(
      '[api/beta/peek] unexpected validation error:',
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: REJECTION_MESSAGE,
        code: 'BETA_CODE_REJECTED',
      },
      { status: 400 },
    );
  }
}

/**
 * POST /api/beta/peek
 *
 * Request:  { "code": "KIRA-XXXX-XXXX" }
 * Response: { "ok": true, "email": "tester@example.com" }
 */
export async function POST(request: NextRequest) {
  try {
    let body: PeekRequestBody;

    try {
      body = (await request.json()) as PeekRequestBody;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: 'Enter your invitation code.',
          code: 'CODE_REQUIRED',
        },
        { status: 400 },
      );
    }

    const code = normaliseCode(body.code);

    return handlePeek(code);
  } catch (error) {
    console.error(
      '[api/beta/peek][POST] unexpected error:',
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: REJECTION_MESSAGE,
        code: 'BETA_CODE_REJECTED',
      },
      { status: 400 },
    );
  }
}

/**
 * GET /api/beta/peek?code=...
 *
 * Compatibility/direct testing only.
 * This remains strictly read-only.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code') ?? '';

    return handlePeek(code);
  } catch (error) {
    console.error(
      '[api/beta/peek][GET] unexpected error:',
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: REJECTION_MESSAGE,
        code: 'BETA_CODE_REJECTED',
      },
      { status: 400 },
    );
  }
}
