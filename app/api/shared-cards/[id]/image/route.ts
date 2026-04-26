import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import { decodeSharedCardImageDataUrl, getSharedCardLookup } from '@/lib/server/shared-cards';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const share = await getSharedCardLookup(id);

    if (share.status === 'missing') {
      return jsonError('Shared card not found.', 404);
    }
    if (share.status === 'expired') {
      return jsonError('Shared card has expired.', 410);
    }

    const decoded = decodeSharedCardImageDataUrl(share.record.imageDataUrl);
    if (!decoded) {
      return jsonError('Shared card image is invalid.', 500);
    }

    return new NextResponse(decoded.bytes, {
      status: 200,
      headers: {
        'Content-Type': decoded.mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[shared-cards/image] error', error);
    return jsonError('Failed to load shared card image.', 500);
  }
}
