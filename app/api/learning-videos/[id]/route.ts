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
    const video = body?.video;
    if (!video || typeof video !== 'object') {
      return jsonError('Invalid learning video payload.', 400);
    }

    await dbExecute(
      `INSERT INTO learning_videos (user_id, video_id, video_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE video_json = VALUES(video_json), updated_at = NOW()`,
      [user.id, id, JSON.stringify({ ...video, id })]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[learning-videos/put] error', error);
    return jsonError('Failed to update learning video.', 500);
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const { id } = await params;
    await dbExecute('DELETE FROM learning_videos WHERE user_id = ? AND video_id = ?', [user.id, id]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[learning-videos/delete] error', error);
    return jsonError('Failed to delete learning video.', 500);
  }
}
