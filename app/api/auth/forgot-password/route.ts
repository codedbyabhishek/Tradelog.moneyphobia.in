import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server/db';
import { jsonError, parseJsonBody } from '@/lib/server/http';
import { consumeRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { normalizeAuthEmail } from '@/lib/server/auth';
import { createPasswordResetToken, ensurePasswordResetTable } from '@/lib/server/password-reset';
import { sendPasswordResetEmail } from '@/lib/server/email';

export const runtime = 'nodejs';

interface UserRow {
  id: number;
  email: string;
  password_hash: string | null;
}

const GENERIC_RESPONSE = {
  ok: true,
  message: 'If that account exists, a password reset link has been sent.',
};

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    if (!body) {
      return jsonError('Invalid password reset payload.', 400);
    }
    const email = normalizeAuthEmail(String(body?.email || ''));
    const ip = getClientIp(request);

    const limit = await consumeRateLimit({
      prefix: 'auth-forgot-password',
      identifier: `${ip}:${email || 'unknown'}`,
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      blockDurationMs: 15 * 60 * 1000,
    });

    if (!limit.allowed) {
      return jsonError(
        'Too many password reset attempts. Please wait and try again.',
        429,
        { 'Retry-After': String(limit.retryAfterSeconds || 60) },
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    await ensurePasswordResetTable();

    const rows = await dbQuery<UserRow[]>(
      'SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    const user = rows[0];
    if (!user || !user.password_hash) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail({ to: user.email, resetToken: token });

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('[auth/forgot-password] error', error);
    return jsonError('Failed to process password reset request.', 500);
  }
}
