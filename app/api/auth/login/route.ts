import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server/db';
import {
  cleanupExpiredSessions,
  createSession,
  ensureEmailVerificationSchema,
  ensureGoogleAuthSchema,
  setSessionCookie,
  validateLoginInput,
  verifyPassword,
} from '@/lib/server/auth';
import { jsonError, parseJsonBody } from '@/lib/server/http';
import { consumeRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { loadBootstrapData } from '@/lib/server/bootstrap';

export const runtime = 'nodejs';

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  password_hash: string | null;
  email_verified_at: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    if (!body) {
      return jsonError('Invalid login payload.', 400);
    }
    const emailRaw = typeof body?.email === 'string' ? body.email : '';
    const normalizedEmail = emailRaw.trim().toLowerCase();
    const ip = getClientIp(request);

    const [byIpLimit, byIdentityLimit] = await Promise.all([
      consumeRateLimit({
        prefix: 'auth-login-ip',
        identifier: ip,
        windowMs: 10 * 60 * 1000,
        maxRequests: 20,
        blockDurationMs: 10 * 60 * 1000,
      }),
      consumeRateLimit({
        prefix: 'auth-login-identity',
        identifier: `${ip}:${normalizedEmail || 'unknown'}`,
        windowMs: 10 * 60 * 1000,
        maxRequests: 10,
        blockDurationMs: 15 * 60 * 1000,
      }),
    ]);

    if (!byIpLimit.allowed) {
      return jsonError(
        'Too many login attempts. Please wait and try again.',
        429,
        { 'Retry-After': String(byIpLimit.retryAfterSeconds || 60) }
      );
    }
    if (!byIdentityLimit.allowed) {
      return jsonError(
        'Too many login attempts. Please wait and try again.',
        429,
        { 'Retry-After': String(byIdentityLimit.retryAfterSeconds || 60) }
      );
    }

    const validated = validateLoginInput(body || {});

    if (!validated.valid) {
      return jsonError(validated.error, 400);
    }

    await ensureGoogleAuthSchema();
    await ensureEmailVerificationSchema();

    void cleanupExpiredSessions().catch((error) => {
      console.error('[auth/login] cleanup error', error);
    });

    const rows = await dbQuery<UserRow[]>(
      'SELECT id, email, name, password_hash, email_verified_at FROM users WHERE email = ? LIMIT 1',
      [validated.data.email]
    );

    if (rows.length === 0) {
      return jsonError('Invalid email or password.', 401);
    }

    const user = rows[0];
    if (!user.password_hash) {
      return jsonError('Invalid email or password.', 401);
    }

    const passwordOk = await verifyPassword(validated.data.password, user.password_hash);

    if (!passwordOk) {
      return jsonError('Invalid email or password.', 401);
    }

    const sessionToken = await createSession(user.id);
    await setSessionCookie(sessionToken);
    const bootstrap = await loadBootstrapData(user.id, user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: Boolean(user.email_verified_at),
      },
      bootstrap,
    });
  } catch (error) {
    console.error('[auth/login] error', error);
    return jsonError('Failed to login.', 500);
  }
}
