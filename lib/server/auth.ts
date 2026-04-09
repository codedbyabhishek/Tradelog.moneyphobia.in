import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { dbExecute, dbQuery } from '@/lib/server/db';

const SESSION_COOKIE = 'td_session';
const SESSION_TTL_DAYS = 30;
const DEFAULT_BCRYPT_ROUNDS = 10;

function getBcryptRounds() {
  const configured = Number(process.env.AUTH_BCRYPT_ROUNDS || DEFAULT_BCRYPT_ROUNDS);
  if (!Number.isFinite(configured)) return DEFAULT_BCRYPT_ROUNDS;
  return Math.min(14, Math.max(8, Math.floor(configured)));
}

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

let googleAuthSchemaEnsured = false;
let emailVerificationSchemaEnsured = false;

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
  return bcrypt.hash(password, getBcryptRounds());
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function ensureGoogleAuthSchema() {
  if (googleAuthSchemaEnsured) return;

  await dbExecute('ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL');

  try {
    await dbExecute('ALTER TABLE users ADD COLUMN google_sub VARCHAR(255) NULL AFTER password_hash');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('duplicate column')) {
      throw error;
    }
  }

  try {
    await dbExecute('ALTER TABLE users ADD UNIQUE KEY uniq_users_google_sub (google_sub)');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('duplicate key name')) {
      throw error;
    }
  }

  googleAuthSchemaEnsured = true;
}

export async function ensureEmailVerificationSchema() {
  if (emailVerificationSchemaEnsured) return;

  try {
    await dbExecute('ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL AFTER google_sub');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('duplicate column')) {
      throw error;
    }
  }

  await dbExecute('UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW())');

  await dbExecute(
    `CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_email_verification_token_hash (token_hash),
      KEY idx_email_verification_user (user_id),
      KEY idx_email_verification_expires_at (expires_at),
      CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );

  emailVerificationSchemaEnsured = true;
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
  await ensureEmailVerificationSchema();
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
      email_verified_at: string | null;
    }[]
  >(
    `SELECT u.id AS user_id, u.email, u.name, u.email_verified_at
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
    emailVerified: Boolean(rows[0].email_verified_at),
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
