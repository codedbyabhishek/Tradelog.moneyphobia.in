import { afterEach, describe, expect, it } from 'vitest';
import { decryptBrokerCredentials, encryptBrokerCredentials } from '@/lib/server/credentials';

const keyName = 'BROKER_CREDENTIALS_ENCRYPTION_KEY';
const originalKey = process.env[keyName];

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env[keyName];
  } else {
    process.env[keyName] = originalKey;
  }
});

describe('broker credential encryption', () => {
  it('round-trips credentials without leaving their values in the stored payload', () => {
    process.env[keyName] = Buffer.alloc(32, 7).toString('base64');
    const credentials = { clientId: 'demo-client', accessToken: 'sensitive-demo-token' };

    const encrypted = encryptBrokerCredentials(credentials);

    expect(encrypted).not.toContain(credentials.accessToken);
    expect(decryptBrokerCredentials<typeof credentials>(encrypted)).toEqual(credentials);
  });

  it('refuses to encrypt when the server key is missing', () => {
    delete process.env[keyName];

    expect(() => encryptBrokerCredentials({ accessToken: 'demo-token' })).toThrow(keyName);
  });
});
