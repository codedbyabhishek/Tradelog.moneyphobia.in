import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError, parseJsonBody, isUnauthorizedError } from '@/lib/server/http';
import { createSharedCard, getSharedCardById } from '@/lib/server/shared-cards';
import { getSiteUrl } from '@/lib/seo';

export const runtime = 'nodejs';

interface SharedCardBody {
  shareType?: 'performance' | 'trade';
  title?: string;
  caption?: string;
  summaryText?: string;
  imageDataUrl?: string;
  payload?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await parseJsonBody<SharedCardBody>(request);

    if (!body) {
      return jsonError('Invalid shared card payload.', 400);
    }

    const shareType = body.shareType === 'trade' ? 'trade' : body.shareType === 'performance' ? 'performance' : null;
    const title = String(body.title || '').trim();
    const caption = typeof body.caption === 'string' ? body.caption.trim() : '';
    const summaryText = typeof body.summaryText === 'string' ? body.summaryText.trim() : '';
    const imageDataUrl = String(body.imageDataUrl || '').trim();

    if (!shareType || !title || !imageDataUrl.startsWith('data:image/png;base64,')) {
      return jsonError('Shared card title, type, and PNG image are required.', 400);
    }

    const shareId = await createSharedCard({
      userId: user.id,
      shareType,
      title,
      caption: caption || null,
      summaryText: summaryText || null,
      imageDataUrl,
      payload: body.payload || null,
    });

    const siteUrl = getSiteUrl();
    const share = await getSharedCardById(shareId);

    return NextResponse.json({
      shareId,
      pageUrl: `${siteUrl}/share/${shareId}`,
      imageUrl: `${siteUrl}/api/shared-cards/${shareId}/image`,
      expiresAt: share?.expiresAt ?? null,
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonError('Unauthorized', 401);
    }
    console.error('[shared-cards/post] error', error);
    return jsonError('Failed to create shared card.', 500);
  }
}
