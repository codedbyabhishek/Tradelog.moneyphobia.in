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
    const goal = body?.goal;
    if (!goal || typeof goal !== 'object') {
      return jsonError('Invalid goal payload.', 400);
    }

    await dbExecute(
      `INSERT INTO goals (user_id, goal_id, goal_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE goal_json = VALUES(goal_json), updated_at = NOW()`,
      [user.id, id, JSON.stringify({ ...goal, id })]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[goals/put] error', error);
    return jsonError('Failed to update goal.', 500);
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);
    const { id } = await params;

    await dbExecute('DELETE FROM goals WHERE user_id = ? AND goal_id = ?', [user.id, id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[goals/delete] error', error);
    return jsonError('Failed to delete goal.', 500);
  }
}
