// app/api/kira/start/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Redirect all requests to /dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url));
}