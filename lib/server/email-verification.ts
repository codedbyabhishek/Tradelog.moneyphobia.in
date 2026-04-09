import { randomBytes, createHash } from 'crypto';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { ensureEmailVerificationSchema } from '@/lib/server/auth';

const EMAIL_VERIFICATION_TTL_MINUTES = 60;

interface EmailVerificationRow {
  id: number;
  user_id: number;
}

function hashVerificationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createEmailVerificationToken(userId: number) {
  await ensureEmailVerificationSchema();
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashVerificationToken(token);

  await dbExecute(
    'DELETE FROM email_verification_tokens WHERE user_id = ? OR expires_at <= UTC_TIMESTAMP()',
    [userId],
  );

  await dbExecute(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at, used_at, created_at)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), NULL, UTC_TIMESTAMP())`,
    [userId, tokenHash, EMAIL_VERIFICATION_TTL_MINUTES],
  );

  return token;
}

export async function validateEmailVerificationToken(token: string) {
  await ensureEmailVerificationSchema();
  const tokenHash = hashVerificationToken(token);

  const rows = await dbQuery<EmailVerificationRow[]>(
    `SELECT id, user_id
     FROM email_verification_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash],
  );

  return rows[0] || null;
}

export async function consumeEmailVerificationToken(token: string) {
  const row = await validateEmailVerificationToken(token);
  if (!row) return null;

  await dbExecute('UPDATE users SET email_verified_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?', [row.user_id]);
  await dbExecute('UPDATE email_verification_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?', [row.id]);
  await dbExecute('DELETE FROM email_verification_tokens WHERE user_id = ? AND used_at IS NULL', [row.user_id]);

  return row.user_id;
}
