import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

interface IdeaRow {
  idea_id: string;
  idea_json: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const rows = await dbQuery<IdeaRow[]>(
      'SELECT idea_id, idea_json FROM ideas WHERE user_id = ? ORDER BY updated_at DESC',
      [user.id]
    );

    const ideas = rows
      .map((row) => {
        try {
          return JSON.parse(row.idea_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error('[ideas/get] error', error);
    return jsonError('Failed to load ideas.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const body = await request.json();
    const idea = body?.idea;
    if (!idea || typeof idea !== 'object' || !idea.id) {
      return jsonError('Invalid idea payload.', 400);
    }

    await dbExecute(
      `INSERT INTO ideas (user_id, idea_id, idea_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE idea_json = VALUES(idea_json), updated_at = NOW()`,
      [user.id, String(idea.id), JSON.stringify(idea)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ideas/post] error', error);
    return jsonError('Failed to save idea.', 500);
  }
}
