import { dbQuery } from '@/lib/server/db';

type TableColumnMap = Record<string, string[]>;

interface SchemaCheckOptions {
  cacheKey: string;
  requiredTables?: string[];
  requiredColumns?: TableColumnMap;
}

interface SchemaState {
  validated: Set<string>;
}

interface ExistingTableRow {
  table_name: string;
}

interface ExistingColumnRow {
  table_name: string;
  column_name: string;
}

declare global {
  var __traderlogifySchemaState: SchemaState | undefined;
}

function getSchemaState(): SchemaState {
  if (!global.__traderlogifySchemaState) {
    global.__traderlogifySchemaState = {
      validated: new Set<string>(),
    };
  }

  return global.__traderlogifySchemaState;
}

function getCurrentDatabaseName() {
  return process.env.DB_NAME || '';
}

export async function assertSchemaReady(options: SchemaCheckOptions) {
  const state = getSchemaState();
  if (state.validated.has(options.cacheKey)) {
    return;
  }

  const database = getCurrentDatabaseName();
  if (!database) {
    throw new Error('Missing required environment variable: DB_NAME');
  }

  const requiredTables = options.requiredTables || [];
  const requiredColumns = options.requiredColumns || {};
  const missing: string[] = [];

  if (requiredTables.length > 0) {
    const tableRows = await dbQuery<ExistingTableRow[]>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ?
         AND table_name IN (${requiredTables.map(() => '?').join(', ')})`,
      [database, ...requiredTables],
    );

    const existingTables = new Set(tableRows.map((row) => row.table_name));
    for (const table of requiredTables) {
      if (!existingTables.has(table)) {
        missing.push(`table:${table}`);
      }
    }
  }

  const columnEntries = Object.entries(requiredColumns);
  if (columnEntries.length > 0) {
    const columnTableNames = columnEntries.map(([table]) => table);
    const columnRows = await dbQuery<ExistingColumnRow[]>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = ?
         AND table_name IN (${columnTableNames.map(() => '?').join(', ')})`,
      [database, ...columnTableNames],
    );

    const existingColumns = new Map<string, Set<string>>();
    for (const row of columnRows) {
      if (!existingColumns.has(row.table_name)) {
        existingColumns.set(row.table_name, new Set<string>());
      }
      existingColumns.get(row.table_name)?.add(row.column_name);
    }

    for (const [table, columns] of columnEntries) {
      const tableColumns = existingColumns.get(table) || new Set<string>();
      for (const column of columns) {
        if (!tableColumns.has(column)) {
          missing.push(`column:${table}.${column}`);
        }
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Database schema is missing required objects for ${options.cacheKey}: ${missing.join(', ')}`
    );
  }

  state.validated.add(options.cacheKey);
}

export async function assertAuthSchemaReady() {
  await assertSchemaReady({
    cacheKey: 'auth',
    requiredTables: ['users', 'user_sessions', 'email_verification_tokens'],
    requiredColumns: {
      users: ['password_hash', 'google_sub', 'email_verified_at'],
      user_sessions: ['user_id', 'token_hash', 'expires_at'],
      email_verification_tokens: ['user_id', 'token_hash', 'expires_at', 'used_at'],
    },
  });
}

export async function assertPasswordResetSchemaReady() {
  await assertSchemaReady({
    cacheKey: 'password-reset',
    requiredTables: ['password_reset_tokens'],
    requiredColumns: {
      password_reset_tokens: ['user_id', 'token_hash', 'expires_at', 'used_at'],
    },
  });
}

export async function assertRateLimitSchemaReady() {
  await assertSchemaReady({
    cacheKey: 'rate-limit',
    requiredTables: ['auth_rate_limits'],
    requiredColumns: {
      auth_rate_limits: ['key_name', 'requests', 'window_started_at', 'blocked_until', 'updated_at'],
    },
  });
}

export async function assertBillingSchemaReady() {
  await assertSchemaReady({
    cacheKey: 'billing',
    requiredTables: ['billing_subscriptions', 'billing_webhook_events', 'user_settings'],
    requiredColumns: {
      billing_subscriptions: [
        'user_id',
        'provider',
        'plan_code',
        'billing_cycle',
        'subscription_id',
        'customer_id',
        'status',
        'payload_json',
      ],
      billing_webhook_events: ['event_id', 'provider', 'created_at'],
      user_settings: ['user_id', 'key_name', 'value_json'],
    },
  });
}

export async function assertSharedCardsSchemaReady() {
  await assertSchemaReady({
    cacheKey: 'shared-cards',
    requiredTables: ['shared_cards'],
    requiredColumns: {
      shared_cards: [
        'share_id',
        'user_id',
        'share_type',
        'title',
        'caption',
        'summary_text',
        'image_data_url',
        'payload_json',
        'expires_at',
        'created_at',
        'updated_at',
      ],
    },
  });
}
