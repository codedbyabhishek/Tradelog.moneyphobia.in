import { randomBytes, createHash } from 'crypto';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { hashPassword } from '@/lib/server/auth';

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
  await dbExecute(
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at DATETIME NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_password_reset_token_hash (token_hash),
      KEY idx_password_reset_user (user_id),
      KEY idx_password_reset_expires_at (expires_at),
      CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
}

export async function createPasswordResetToken(userId: number) {
  await ensurePasswordResetTable();
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await dbExecute(
    'DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= NOW()',
    [userId],
  );

  await dbExecute(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at, created_at)
     VALUES (?, ?, ?, NULL, NOW())`,
    [userId, tokenHash, expiresAt],
  );

  return token;
}

export async function validatePasswordResetToken(token: string) {
  await ensurePasswordResetTable();
  const tokenHash = hashResetToken(token);

  const rows = await dbQuery<ResetTokenRow[]>(
    `SELECT id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );

  return rows[0] || null;
}

export async function consumePasswordResetToken(token: string, newPassword: string) {
  const row = await validatePasswordResetToken(token);
  if (!row) return null;

  const passwordHash = await hashPassword(newPassword);

  await dbExecute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
    passwordHash,
    row.user_id,
  ]);
  await dbExecute('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [row.id]);
  await dbExecute('DELETE FROM user_sessions WHERE user_id = ?', [row.user_id]);

  return row.user_id;
}
