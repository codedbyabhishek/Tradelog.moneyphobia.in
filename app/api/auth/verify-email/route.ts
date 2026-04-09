import { NextRequest, NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import { consumeEmailVerificationToken, validateEmailVerificationToken } from '@/lib/server/email-verification';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = String(request.nextUrl.searchParams.get('token') || '').trim();
    if (!token) {
      return jsonError('Missing verification token.', 400);
    }

    const row = await validateEmailVerificationToken(token);
    return NextResponse.json({ ok: Boolean(row) });
  } catch (error) {
    console.error('[auth/verify-email/get] error', error);
    return jsonError('Failed to validate verification token.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.token || '').trim();

    if (!token) {
      return jsonError('Missing verification token.', 400);
    }

    const userId = await consumeEmailVerificationToken(token);
    if (!userId) {
      return jsonError('This verification link is invalid or has expired.', 400);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth/verify-email/post] error', error);
    return jsonError('Failed to verify email.', 500);
  }
}
