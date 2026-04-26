import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { jsonError, parseJsonBody, isUnauthorizedError } from '@/lib/server/http';
import {
  createSharedCard,
  decodeSharedCardImageDataUrl,
  getSharedCardById,
  MAX_SHARED_CARD_CAPTION_LENGTH,
  MAX_SHARED_CARD_IMAGE_BYTES,
  MAX_SHARED_CARD_PAYLOAD_BYTES,
  MAX_SHARED_CARD_SUMMARY_LENGTH,
  MAX_SHARED_CARD_TITLE_LENGTH,
} from '@/lib/server/shared-cards';
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
    if (title.length > MAX_SHARED_CARD_TITLE_LENGTH) {
      return jsonError(`Shared card title must be ${MAX_SHARED_CARD_TITLE_LENGTH} characters or less.`, 400);
    }
    if (caption.length > MAX_SHARED_CARD_CAPTION_LENGTH) {
      return jsonError(`Shared card caption must be ${MAX_SHARED_CARD_CAPTION_LENGTH} characters or less.`, 400);
    }
    if (summaryText.length > MAX_SHARED_CARD_SUMMARY_LENGTH) {
      return jsonError(`Shared card summary must be ${MAX_SHARED_CARD_SUMMARY_LENGTH} characters or less.`, 400);
    }

    const decodedImage = decodeSharedCardImageDataUrl(imageDataUrl);
    if (!decodedImage) {
      return jsonError('Shared card image must be a valid PNG.', 400);
    }
    if (decodedImage.bytes.length > MAX_SHARED_CARD_IMAGE_BYTES) {
      return jsonError('Shared card image exceeds the 1.5 MB limit.', 413);
    }

    const payloadJson = body.payload ? JSON.stringify(body.payload) : '';
    if (payloadJson.length > MAX_SHARED_CARD_PAYLOAD_BYTES) {
      return jsonError('Shared card payload exceeds the allowed size.', 413);
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
