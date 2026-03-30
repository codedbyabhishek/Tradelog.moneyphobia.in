import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { dbExecute, dbQuery } from '@/lib/server/db';

const SESSION_COOKIE = 'td_session';
const SESSION_TTL_DAYS = 30;

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newExpiryDate(): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_TTL_DAYS);
  return expires;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeAuthEmail(email: string): string {
  return normalizeEmail(email);
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = newExpiryDate();

  await dbExecute(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, NOW())`,
    [userId, tokenHash, expiresAt]
  );

  return rawToken;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: newExpiryDate(),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });
}

export async function deleteSessionByToken(token: string) {
  const tokenHash = hashSessionToken(token);
  await dbExecute('DELETE FROM user_sessions WHERE token_hash = ?', [tokenHash]);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return null;
  }

  const tokenHash = hashSessionToken(sessionToken);

  const rows = await dbQuery<
    {
      user_id: number;
      email: string;
      name: string | null;
    }[]
  >(
    `SELECT u.id AS user_id, u.email, u.name
     FROM user_sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: rows[0].user_id,
    email: rows[0].email,
    name: rows[0].name,
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function cleanupExpiredSessions() {
  await dbExecute('DELETE FROM user_sessions WHERE expires_at <= NOW()');
}

export function validateSignupInput(payload: {
  email?: string;
  password?: string;
  name?: string;
}) {
  const email = normalizeEmail(payload.email || '');
  const password = payload.password || '';
  const name = (payload.name || '').trim();

  if (!email || !email.includes('@')) {
    return { valid: false, error: 'Please enter a valid email address.' } as const;
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' } as const;
  }

  if (name.length > 80) {
    return { valid: false, error: 'Name must be 80 characters or less.' } as const;
  }

  return {
    valid: true,
    data: {
      email,
      password,
      name: name || null,
    },
  } as const;
}

export function validateLoginInput(payload: {
  email?: string;
  password?: string;
}) {
  const email = normalizeEmail(payload.email || '');
  const password = payload.password || '';

  if (!email || !email.includes('@')) {
    return { valid: false, error: 'Please enter a valid email address.' } as const;
  }

  if (!password) {
    return { valid: false, error: 'Password is required.' } as const;
  }

  return { valid: true, data: { email, password } } as const;
}
