import { randomUUID } from 'crypto';
import type { BrokerId } from '@/lib/brokers';
import { BROKER_DEFINITIONS } from '@/lib/brokers';
import type { Currency } from '@/lib/types';
import { encryptBrokerCredentials } from '@/lib/server/credentials';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { assertBrokerAccountsSchemaReady } from '@/lib/server/schema';

const SUPPORTED_CURRENCIES: Currency[] = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'];

interface BrokerAccountRow {
  account_id: string;
  broker_id: BrokerId;
  account_name: string;
  account_number_last4: string | null;
  currency: Currency;
  is_default: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BrokerAccount {
  id: string;
  brokerId: BrokerId;
  name: string;
  accountNumberLast4: string | null;
  currency: Currency;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrokerAccountInput {
  brokerId: BrokerId;
  name: string;
  accountReference?: string;
  currency: Currency;
}

function asIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function mapAccount(row: BrokerAccountRow): BrokerAccount {
  return {
    id: row.account_id,
    brokerId: row.broker_id,
    name: row.account_name,
    accountNumberLast4: row.account_number_last4 || null,
    currency: row.currency,
    isDefault: Boolean(row.is_default),
    createdAt: asIsoString(row.created_at),
    updatedAt: asIsoString(row.updated_at),
  };
}

function defaultAccountId(userId: number) {
  return `legacy-${userId}`;
}

function isBrokerId(value: string): value is BrokerId {
  return BROKER_DEFINITIONS.some((broker) => broker.id === value);
}

export async function ensureDefaultBrokerAccount(userId: number) {
  await assertBrokerAccountsSchemaReady();

  const accountId = defaultAccountId(userId);
  await dbExecute(
    `INSERT INTO broker_accounts
      (user_id, account_id, broker_id, account_name, account_reference_encrypted, account_number_last4, currency, is_default, created_at, updated_at)
     VALUES (?, ?, 'manual', 'Legacy journal', NULL, NULL, 'INR', 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE account_id = account_id`,
    [userId, accountId],
  );

  return accountId;
}

export async function listBrokerAccounts(userId: number): Promise<BrokerAccount[]> {
  await ensureDefaultBrokerAccount(userId);
  const rows = await dbQuery<BrokerAccountRow[]>(
    `SELECT account_id, broker_id, account_name, account_number_last4, currency, is_default, created_at, updated_at
     FROM broker_accounts
     WHERE user_id = ?
     ORDER BY is_default DESC, created_at ASC`,
    [userId],
  );
  return rows.map(mapAccount);
}

export async function getBrokerAccount(userId: number, accountId: string): Promise<BrokerAccount | null> {
  await ensureDefaultBrokerAccount(userId);
  const rows = await dbQuery<BrokerAccountRow[]>(
    `SELECT account_id, broker_id, account_name, account_number_last4, currency, is_default, created_at, updated_at
     FROM broker_accounts
     WHERE user_id = ? AND account_id = ?
     LIMIT 1`,
    [userId, accountId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function resolveBrokerAccount(userId: number, accountId?: string | null): Promise<BrokerAccount> {
  const resolvedId = accountId?.trim() || await ensureDefaultBrokerAccount(userId);
  const account = await getBrokerAccount(userId, resolvedId);
  if (!account) {
    throw new Error('The selected broker account does not exist. Choose an account you own.');
  }
  return account;
}

export async function createBrokerAccount(userId: number, input: CreateBrokerAccountInput): Promise<BrokerAccount> {
  await ensureDefaultBrokerAccount(userId);

  const brokerId = String(input.brokerId || '').trim();
  const name = String(input.name || '').trim().replace(/\s+/g, ' ');
  const accountReference = String(input.accountReference || '').trim().replace(/\s+/g, '');
  const currency = input.currency;

  if (!isBrokerId(brokerId)) {
    throw new Error('Choose a supported broker.');
  }
  if (!name || name.length > 80) {
    throw new Error('Account name must be between 1 and 80 characters.');
  }
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error('Choose a supported account currency.');
  }
  if (brokerId !== 'manual' && (!accountReference || !/^[A-Za-z0-9._-]{3,128}$/.test(accountReference))) {
    throw new Error('Enter a valid broker account number or client ID.');
  }
  if (accountReference && !/^[A-Za-z0-9._-]{3,128}$/.test(accountReference)) {
    throw new Error('Account number may contain letters, numbers, dots, underscores, and hyphens only.');
  }

  const accountId = randomUUID();
  const encryptedReference = accountReference
    ? encryptBrokerCredentials({ accountReference })
    : null;
  const last4 = accountReference ? accountReference.slice(-4) : null;

  await dbExecute(
    `INSERT INTO broker_accounts
      (user_id, account_id, broker_id, account_name, account_reference_encrypted, account_number_last4, currency, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
    [userId, accountId, brokerId, name, encryptedReference, last4, currency],
  );

  const account = await getBrokerAccount(userId, accountId);
  if (!account) {
    throw new Error('Broker account was created but could not be loaded.');
  }
  return account;
}
