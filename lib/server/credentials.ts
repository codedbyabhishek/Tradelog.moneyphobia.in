import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const CREDENTIALS_ENCRYPTION_KEY_ENV = 'BROKER_CREDENTIALS_ENCRYPTION_KEY';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

interface EncryptedCredentialPayload {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

function getEncryptionKey(): Buffer {
  const configured = process.env[CREDENTIALS_ENCRYPTION_KEY_ENV]?.trim();
  if (!configured) {
    throw new Error(`${CREDENTIALS_ENCRYPTION_KEY_ENV} must be configured to store broker credentials.`);
  }

  const key = Buffer.from(configured, 'base64');
  if (key.length !== 32) {
    throw new Error(`${CREDENTIALS_ENCRYPTION_KEY_ENV} must be a base64-encoded 32-byte key.`);
  }

  return key;
}

function isEncryptedCredentialPayload(value: unknown): value is EncryptedCredentialPayload {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Partial<EncryptedCredentialPayload>;
  return (
    payload.version === 1 &&
    typeof payload.iv === 'string' &&
    typeof payload.tag === 'string' &&
    typeof payload.ciphertext === 'string'
  );
}

/**
 * Encrypts broker credentials before they are persisted in `user_settings`.
 * The ciphertext is self-contained, while the encryption key stays in server-only
 * environment configuration.
 */
export function encryptBrokerCredentials(value: unknown): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return JSON.stringify({
    version: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  } satisfies EncryptedCredentialPayload);
}

/**
 * Decrypts encrypted credentials. Plain JSON is accepted only to allow existing
 * installations to keep working until the owner re-saves each broker connection.
 */
export function decryptBrokerCredentials<T>(storedValue: string): T {
  const parsed: unknown = JSON.parse(storedValue);

  if (!isEncryptedCredentialPayload(parsed)) {
    return parsed as T;
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parsed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(parsed.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(plaintext.toString('utf8')) as T;
}
