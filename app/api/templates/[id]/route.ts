import { NextRequest, NextResponse } from 'next/server';
import { dbExecute } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const { id } = await params;
    const body = await request.json();
    const template = body?.template;
    if (!template || typeof template !== 'object') {
      return jsonError('Invalid template payload.', 400);
    }

    await dbExecute(
      `INSERT INTO templates (user_id, template_id, template_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE template_json = VALUES(template_json), updated_at = NOW()`,
      [user.id, id, JSON.stringify({ ...template, id })]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[templates/put] error', error);
    return jsonError('Failed to update template.', 500);
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);
    const { id } = await params;

    await dbExecute('DELETE FROM templates WHERE user_id = ? AND template_id = ?', [user.id, id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[templates/delete] error', error);
    return jsonError('Failed to delete template.', 500);
  }
}
