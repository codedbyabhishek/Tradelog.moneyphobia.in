import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

interface FilterRow {
  filter_id: string;
  filter_json: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const rows = await dbQuery<FilterRow[]>(
      'SELECT filter_id, filter_json FROM filters WHERE user_id = ? ORDER BY updated_at DESC',
      [user.id]
    );

    const filters = rows
      .map((row) => {
        try {
          return JSON.parse(row.filter_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ filters });
  } catch (error) {
    console.error('[filters/get] error', error);
    return jsonError('Failed to load filters.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const body = await request.json();
    const filter = body?.filter;
    if (!filter || typeof filter !== 'object' || !filter.id) {
      return jsonError('Invalid filter payload.', 400);
    }

    await dbExecute(
      `INSERT INTO filters (user_id, filter_id, filter_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE filter_json = VALUES(filter_json), updated_at = NOW()`,
      [user.id, String(filter.id), JSON.stringify(filter)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[filters/post] error', error);
    return jsonError('Failed to save filter.', 500);
  }
}
