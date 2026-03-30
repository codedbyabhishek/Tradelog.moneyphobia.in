import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

interface TemplateRow {
  template_id: string;
  template_json: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const rows = await dbQuery<TemplateRow[]>(
      'SELECT template_id, template_json FROM templates WHERE user_id = ? ORDER BY updated_at DESC',
      [user.id]
    );

    const templates = rows
      .map((row) => {
        try {
          return JSON.parse(row.template_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('[templates/get] error', error);
    return jsonError('Failed to load templates.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const body = await request.json();
    const template = body?.template;
    if (!template || typeof template !== 'object' || !template.id) {
      return jsonError('Invalid template payload.', 400);
    }

    await dbExecute(
      `INSERT INTO templates (user_id, template_id, template_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE template_json = VALUES(template_json), updated_at = NOW()`,
      [user.id, String(template.id), JSON.stringify(template)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[templates/post] error', error);
    return jsonError('Failed to save template.', 500);
  }
}
