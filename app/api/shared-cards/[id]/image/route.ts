import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import { getSharedCardLookup } from '@/lib/server/shared-cards';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const [, mimeType, base64] = match;
  return {
    mimeType,
    bytes: Buffer.from(base64, 'base64'),
  };
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

    const decoded = decodeDataUrl(share.record.imageDataUrl);
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
