import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { ResultSetHeader } from 'mysql2';
import { dbExecute, dbQuery } from '@/lib/server/db';
import {
  cleanupExpiredSessions,
  createSession,
  ensureEmailVerificationSchema,
  ensureGoogleAuthSchema,
  normalizeAuthEmail,
  setSessionCookie,
} from '@/lib/server/auth';
import { jsonError, parseJsonBody } from '@/lib/server/http';
import { consumeRateLimit, getClientIp } from '@/lib/server/rate-limit';
import { loadBootstrapData } from '@/lib/server/bootstrap';

export const runtime = 'nodejs';

interface GoogleUserRow {
  id: number;
  email: string;
  name: string | null;
  google_sub: string | null;
}

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
}

const googleClient = new OAuth2Client();

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request);
    if (!body) {
      return jsonError('Invalid Google sign-in payload.', 400);
    }
    const credential = String(body?.credential || '').trim();
    const ip = getClientIp(request);

    const limit = await consumeRateLimit({
      prefix: 'auth-google-ip',
      identifier: ip,
      windowMs: 10 * 60 * 1000,
      maxRequests: 20,
      blockDurationMs: 10 * 60 * 1000,
    });

    if (!limit.allowed) {
      return jsonError(
        'Too many Google sign-in attempts. Please wait and try again.',
        429,
        { 'Retry-After': String(limit.retryAfterSeconds || 60) },
      );
    }

    if (!credential) {
      return jsonError('Missing Google credential.', 400);
    }

    const clientId = getGoogleClientId();
    if (!clientId) {
      return jsonError('Google sign-in is not configured yet.', 503);
    }

    await ensureGoogleAuthSchema();
    await ensureEmailVerificationSchema();

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    const googleSub = String(payload?.sub || '').trim();
    const email = normalizeAuthEmail(String(payload?.email || ''));
    const emailVerified = Boolean(payload?.email_verified);
    const name = payload?.name ? String(payload.name).trim().slice(0, 80) : null;

    if (!googleSub || !email || !emailVerified) {
      return jsonError('Google account verification failed.', 401);
    }

    void cleanupExpiredSessions().catch((error) => {
      console.error('[auth/google] cleanup error', error);
    });

    const existingByGoogle = await dbQuery<GoogleUserRow[]>(
      'SELECT id, email, name, google_sub FROM users WHERE google_sub = ? LIMIT 1',
      [googleSub],
    );

    let user: GoogleUserRow | null = existingByGoogle[0] || null;

    if (!user) {
      const existingByEmail = await dbQuery<GoogleUserRow[]>(
        'SELECT id, email, name, google_sub FROM users WHERE email = ? LIMIT 1',
        [email],
      );

      if (existingByEmail[0]) {
        user = existingByEmail[0];
        await dbExecute(
          `UPDATE users
           SET google_sub = ?, email_verified_at = COALESCE(email_verified_at, NOW()), name = COALESCE(NULLIF(?, ''), name), updated_at = NOW()
           WHERE id = ?`,
          [googleSub, name || '', user.id],
        );
        user = {
          ...user,
          google_sub: googleSub,
          name: name || user.name,
        };
      } else {
        const result = (await dbExecute(
          `INSERT INTO users (email, password_hash, google_sub, email_verified_at, name, created_at, updated_at)
           VALUES (?, NULL, ?, NOW(), ?, NOW(), NOW())`,
          [email, googleSub, name],
        )) as ResultSetHeader;

        user = {
          id: Number(result.insertId),
          email,
          name,
          google_sub: googleSub,
        };
      }
    }

    const sessionToken = await createSession(user.id);
    await setSessionCookie(sessionToken);
    const bootstrap = await loadBootstrapData(user.id, user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
      },
      bootstrap,
    });
  } catch (error) {
    console.error('[auth/google] error', error);
    return jsonError('Failed to sign in with Google.', 500);
  }
}
