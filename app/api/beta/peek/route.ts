// app/api/beta/peek/route.ts
//
// BETA INVITATION PEEK
// --------------------
//
// Read-only validation of a beta invitation.
//
// This route:
//   - validates the invitation code;
//   - returns the invitation-bound email;
//   - NEVER consumes the code;
//   - NEVER creates an Auth account;
//   - NEVER establishes Person identity;
//   - NEVER establishes Organisation identity.
//
// The beta code is an access/provenance credential, not an identity authority.
//
// POST is the primary application contract.
// GET is retained for direct browser testing and compatibility.
//
// Every invalid/rejected code receives the same external message so that the
// endpoint cannot be used to distinguish unknown, expired, revoked or already
// redeemed invitation codes.

import { NextRequest, NextResponse } from 'next/server';

import {
  BETA_CODE_REJECTION_MESSAGE,
  peekBetaCode,
} from '@/lib/billing/beta-codes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REJECTION_MESSAGE = BETA_CODE_REJECTION_MESSAGE;

async function handlePeek(code: string) {
  const normalisedCode = code.trim();

  if (!normalisedCode) {
    return NextResponse.json({
      ok: false,
      error: 'Enter your invitation code.',
    });
  }

  try {
    const result = await peekBetaCode(normalisedCode);

    if (!result.ok) {
      console.warn(
        `[api/beta/peek] rejected beta code: reason=${result.reason}`,
      );

      return NextResponse.json({
        ok: false,
        error: REJECTION_MESSAGE,
      });
    }

    return NextResponse.json({
      ok: true,
      email: result.email,
    });
  } catch (error) {
    /*
     * Do not expose database/provider details to the visitor.
     *
     * The operator log contains the actual failure.
     */
    console.error('[api/beta/peek] unexpected validation error:', error);

    return NextResponse.json({
      ok: false,
      error: REJECTION_MESSAGE,
    });
  }
}

/**
 * POST /api/beta/peek
 *
 * Request:
 * {
 *   "code": "KIRA-XXXX-XXXX"
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "email": "tester@example.com"
 * }
 *
 * or:
 *
 * {
 *   "ok": false,
 *   "error": "..."
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
 * Retained for compatibility and direct browser testing.
 *
 * This is deliberately still read-only.
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