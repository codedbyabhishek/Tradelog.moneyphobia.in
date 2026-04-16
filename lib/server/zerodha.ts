import { dbExecute, dbQuery } from '@/lib/server/db';

const ZERODHA_SETTINGS_KEY = 'broker_zerodha_config';

interface ZerodhaConfigRow {
  value_json: string;
}

export interface ZerodhaStoredConfig {
  apiKey: string;
  apiSecret: string;
  redirectUri: string;
  updatedAt: string;
}

export async function getStoredZerodhaConfig(userId: number): Promise<ZerodhaStoredConfig | null> {
  const rows = await dbQuery<ZerodhaConfigRow[]>(
    'SELECT value_json FROM user_settings WHERE user_id = ? AND key_name = ? LIMIT 1',
    [userId, ZERODHA_SETTINGS_KEY]
  );

  if (rows.length === 0) return null;

  try {
    const parsed = JSON.parse(rows[0].value_json) as ZerodhaStoredConfig;
    if (!parsed?.apiKey || !parsed?.apiSecret || !parsed?.redirectUri) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveZerodhaConfig(userId: number, config: ZerodhaStoredConfig) {
  await dbExecute(
    `INSERT INTO user_settings (user_id, key_name, value_json, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()`,
    [userId, ZERODHA_SETTINGS_KEY, JSON.stringify(config)]
  );
}

export async function deleteZerodhaConfig(userId: number) {
  await dbExecute('DELETE FROM user_settings WHERE user_id = ? AND key_name = ?', [userId, ZERODHA_SETTINGS_KEY]);
}
