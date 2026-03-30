import { NextRequest, NextResponse } from 'next/server';
import { ResultSetHeader } from 'mysql2';
import { dbExecute, dbQuery } from '@/lib/server/db';
import {
  cleanupExpiredSessions,
  createSession,
  hashPassword,
  setSessionCookie,
  validateSignupInput,
} from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { consumeRateLimit, getClientIp } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailRaw = typeof body?.email === 'string' ? body.email : '';
    const normalizedEmail = emailRaw.trim().toLowerCase();
    const ip = getClientIp(request);

    const byIpLimit = await consumeRateLimit({
      prefix: 'auth-signup-ip',
      identifier: ip,
      windowMs: 30 * 60 * 1000,
      maxRequests: 10,
      blockDurationMs: 30 * 60 * 1000,
    });
    if (!byIpLimit.allowed) {
      return jsonError(
        'Too many signup attempts. Please wait and try again.',
        429,
        { 'Retry-After': String(byIpLimit.retryAfterSeconds || 60) }
      );
    }

    const byIdentityLimit = await consumeRateLimit({
      prefix: 'auth-signup-identity',
      identifier: `${ip}:${normalizedEmail || 'unknown'}`,
      windowMs: 30 * 60 * 1000,
      maxRequests: 5,
      blockDurationMs: 30 * 60 * 1000,
    });
    if (!byIdentityLimit.allowed) {
      return jsonError(
        'Too many signup attempts. Please wait and try again.',
        429,
        { 'Retry-After': String(byIdentityLimit.retryAfterSeconds || 60) }
      );
    }

    const validated = validateSignupInput(body || {});

    if (!validated.valid) {
      return jsonError(validated.error, 400);
    }

    await cleanupExpiredSessions();

    const existing = await dbQuery<{ id: number }[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [validated.data.email]
    );

    if (existing.length > 0) {
      return jsonError('Email is already registered.', 409);
    }

    const passwordHash = await hashPassword(validated.data.password);

    const result = (await dbExecute(
      `INSERT INTO users (email, password_hash, name, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [validated.data.email, passwordHash, validated.data.name]
    )) as ResultSetHeader;

    const userId = Number(result.insertId);
    const sessionToken = await createSession(userId);
    await setSessionCookie(sessionToken);

    return NextResponse.json(
      {
        user: {
          id: userId,
          email: validated.data.email,
          name: validated.data.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[auth/signup] error', error);
    return jsonError('Failed to create account.', 500);
  }
}
