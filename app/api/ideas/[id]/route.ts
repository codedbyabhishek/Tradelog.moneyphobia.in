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
    const idea = body?.idea;
    if (!idea || typeof idea !== 'object') {
      return jsonError('Invalid idea payload.', 400);
    }

    await dbExecute(
      `INSERT INTO ideas (user_id, idea_id, idea_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE idea_json = VALUES(idea_json), updated_at = NOW()`,
      [user.id, id, JSON.stringify({ ...idea, id })]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ideas/put] error', error);
    return jsonError('Failed to update idea.', 500);
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);
    const { id } = await params;

    await dbExecute('DELETE FROM ideas WHERE user_id = ? AND idea_id = ?', [user.id, id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ideas/delete] error', error);
    return jsonError('Failed to delete idea.', 500);
  }
}
