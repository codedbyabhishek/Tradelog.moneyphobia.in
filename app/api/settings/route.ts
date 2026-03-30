import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

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
      try {
        settings[row.key_name] = JSON.parse(row.value_json);
      } catch {
        settings[row.key_name] = null;
      }
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

    const body = await request.json();
    const key = String(body?.key || '').trim();
    const value = body?.value;

    if (!key) {
      return jsonError('Invalid settings key.', 400);
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
