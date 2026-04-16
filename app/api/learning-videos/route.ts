import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';

interface LearningVideoRow {
  video_id: string;
  video_json: string;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const rows = await dbQuery<LearningVideoRow[]>(
      'SELECT video_id, video_json FROM learning_videos WHERE user_id = ? ORDER BY updated_at DESC',
      [user.id]
    );

    const videos = rows
      .map((row) => {
        try {
          return JSON.parse(row.video_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('[learning-videos/get] error', error);
    return jsonError('Failed to load learning videos.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const body = await request.json();
    const video = body?.video;
    if (!video || typeof video !== 'object' || !video.id) {
      return jsonError('Invalid learning video payload.', 400);
    }

    await dbExecute(
      `INSERT INTO learning_videos (user_id, video_id, video_json, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE video_json = VALUES(video_json), updated_at = NOW()`,
      [user.id, String(video.id), JSON.stringify(video)]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[learning-videos/post] error', error);
    return jsonError('Failed to save learning video.', 500);
  }
}
