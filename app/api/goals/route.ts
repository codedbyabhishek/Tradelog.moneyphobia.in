import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

interface GoalRow {
  goal_id: string;
  goal_json: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const rows = await dbQuery<GoalRow[]>(
      'SELECT goal_id, goal_json FROM goals WHERE user_id = ? ORDER BY updated_at DESC',
      [user.id]
    );

    const goals = rows
      .map((row) => {
        try {
          return JSON.parse(row.goal_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ goals });
  } catch (error) {
    console.error('[goals/get] error', error);
    return jsonError('Failed to load goals.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const body = await request.json();
    const goal = body?.goal;
    if (!goal || typeof goal !== 'object' || !goal.id) {
      return jsonError('Invalid goal payload.', 400);
    }

    await dbExecute(
      `INSERT INTO goals (user_id, goal_id, goal_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE goal_json = VALUES(goal_json), updated_at = NOW()`,
      [user.id, String(goal.id), JSON.stringify(goal)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[goals/post] error', error);
    return jsonError('Failed to save goal.', 500);
  }
}
