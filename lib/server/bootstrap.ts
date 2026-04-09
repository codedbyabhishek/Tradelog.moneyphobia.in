import { dbQuery } from '@/lib/server/db';
import type { AppBootstrapData } from '@/lib/bootstrap';
import { getAdminBillingOverride } from '@/lib/server/admin';

interface JsonRow {
  payload_json: string;
}

interface SettingsRow {
  key_name: string;
  value_json: string;
}

function parseJsonRows<T>(rows: JsonRow[]): T[] {
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.payload_json) as T;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as T[];
}

export async function loadBootstrapData(userId: number, email?: string | null): Promise<AppBootstrapData> {
  const [tradesRows, ideasRows, goalsRows, filtersRows, templatesRows, settingsRows] = await Promise.all([
    dbQuery<JsonRow[]>(
      `SELECT trade_json AS payload_json
       FROM trades
       WHERE user_id = ?
       ORDER BY trade_date DESC, updated_at DESC`,
      [userId],
    ),
    dbQuery<JsonRow[]>(
      `SELECT idea_json AS payload_json
       FROM ideas
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [userId],
    ),
    dbQuery<JsonRow[]>(
      `SELECT goal_json AS payload_json
       FROM goals
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [userId],
    ),
    dbQuery<JsonRow[]>(
      `SELECT filter_json AS payload_json
       FROM filters
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [userId],
    ),
    dbQuery<JsonRow[]>(
      `SELECT template_json AS payload_json
       FROM templates
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [userId],
    ),
    dbQuery<SettingsRow[]>(
      `SELECT key_name, value_json
       FROM user_settings
       WHERE user_id = ?`,
      [userId],
    ),
  ]);

  const settings: AppBootstrapData['settings'] = {};
  for (const row of settingsRows) {
    try {
      settings[row.key_name as keyof AppBootstrapData['settings']] = JSON.parse(row.value_json);
    } catch {
      settings[row.key_name as keyof AppBootstrapData['settings']] = undefined;
    }
  }

  const adminBillingOverride = getAdminBillingOverride(email);
  if (adminBillingOverride) {
    settings.billing = adminBillingOverride;
  }

  return {
    userId,
    trades: parseJsonRows(tradesRows),
    ideas: parseJsonRows(ideasRows),
    goals: parseJsonRows(goalsRows),
    filters: parseJsonRows(filtersRows),
    templates: parseJsonRows(templatesRows),
    settings,
  };
}
