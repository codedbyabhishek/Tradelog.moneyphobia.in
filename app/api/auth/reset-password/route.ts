import { NextRequest, NextResponse } from 'next/server';
import { jsonError, parseJsonBody } from '@/lib/server/http';
import { consumePasswordResetToken, validatePasswordResetToken } from '@/lib/server/password-reset';

export const runtime = 'nodejs';

function validatePassword(password: string) {
  return password.length >= 8;
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    if (!body) {
      return jsonError('Invalid reset payload.', 400);
    }
    const token = String(body?.token || '').trim();
    const newPassword = String(body?.password || '');

    if (!token) {
      return jsonError('Missing reset token.', 400);
    }

    if (!validatePassword(newPassword)) {
      return jsonError('Password must be at least 8 characters.', 400);
    }

    const userId = await consumePasswordResetToken(token, newPassword);
    if (!userId) {
      return jsonError('This reset link is invalid or has expired.', 400);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth/reset-password] error', error);
    return jsonError('Failed to reset password.', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = String(request.nextUrl.searchParams.get('token') || '').trim();
    if (!token) {
      return jsonError('Missing reset token.', 400);
    }

    const row = await validatePasswordResetToken(token);
    return NextResponse.json({ ok: Boolean(row) });
  } catch (error) {
    console.error('[auth/reset-password/get] error', error);
    return jsonError('Failed to validate reset token.', 500);
  }
}
