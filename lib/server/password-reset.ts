import { randomBytes, createHash } from 'crypto';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/auth';
import { assertPasswordResetSchemaReady } from '@/lib/server/schema';

const RESET_TOKEN_TTL_MINUTES = 60;

interface ResetTokenRow {
  id: number;
  user_id: number;
  expires_at: string;
  used_at: string | null;
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function ensurePasswordResetTable() {
  await assertPasswordResetSchemaReady();
}

export async function createPasswordResetToken(userId: number) {
  await ensurePasswordResetTable();
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);

  await dbExecute(
    'DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= UTC_TIMESTAMP()',
    [userId],
  );

  await dbExecute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at, created_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), NULL, UTC_TIMESTAMP())`,
    [userId, tokenHash, RESET_TOKEN_TTL_MINUTES],
  );

  return token;
}

export async function validatePasswordResetToken(token: string) {
  await ensurePasswordResetTable();
  const tokenHash = hashResetToken(token);

  const rows = await dbQuery<ResetTokenRow[]>(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
  );

  return rows[0] || null;
}

export async function consumePasswordResetToken(token: string, newPassword: string) {
  const row = await validatePasswordResetToken(token);
  if (!row) return null;

  const passwordHash = await hashPassword(newPassword);

  await dbExecute('UPDATE users SET password_hash = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [
    passwordHash,
    row.user_id,
  ]);
  await dbExecute('UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?', [row.id]);
  await dbExecute('DELETE FROM user_sessions WHERE user_id = ?', [row.user_id]);

  return row.user_id;
}
