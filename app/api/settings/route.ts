import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { getAdminBillingOverride } from '@/lib/server/admin';
import { jsonError, parseJsonBody } from '@/lib/server/http';
import { isSensitiveSettingsKey } from '@/lib/server/settings';

export const runtime = 'nodejs';

interface SettingsRow {
  key_name: string;
  value_json: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const rows = await dbQuery<SettingsRow[]>(
      'SELECT key_name, value_json FROM user_settings WHERE user_id = ?',
      [user.id]
    );

    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      if (isSensitiveSettingsKey(row.key_name)) {
        continue;
      }
      try {
        settings[row.key_name] = JSON.parse(row.value_json);
      } catch {
        settings[row.key_name] = null;
      }
    }

    const adminBillingOverride = getAdminBillingOverride(user.email);
    if (adminBillingOverride) {
      settings.billing = adminBillingOverride;
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[settings/get] error', error);
    return jsonError('Failed to load settings.', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const body = await parseJsonBody(request);
    if (!body) {
      return jsonError('Invalid settings payload.', 400);
    }
    const key = String(body?.key || '').trim();
    const value = body?.value;

    if (!key) {
      return jsonError('Invalid settings key.', 400);
    }
    if (key.length > 100) {
      return jsonError('Settings key is too long.', 400);
    }
    if (isSensitiveSettingsKey(key)) {
      return jsonError('Broker credentials must be managed through the broker configuration endpoints.', 403);
    }

    await dbExecute(
      `INSERT INTO user_settings (user_id, key_name, value_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = NOW()`,
      [user.id, key, JSON.stringify(value)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[settings/put] error', error);
    return jsonError('Failed to save settings.', 500);
  }
}
