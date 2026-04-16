import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/server/http';
import { getSharedCardLookup } from '@/lib/server/shared-cards';
import { getSiteUrl } from '@/lib/seo';

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

    const siteUrl = getSiteUrl();
    const record = share.record;

    return NextResponse.json({
      shareId: record.shareId,
      shareType: record.shareType,
      title: record.title,
      caption: record.caption,
      summaryText: record.summaryText,
      payload: record.payload,
      pageUrl: `${siteUrl}/share/${record.shareId}`,
      imageUrl: `${siteUrl}/api/shared-cards/${record.shareId}/image`,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error('[shared-cards/get] error', error);
    return jsonError('Failed to load shared card.', 500);
  }
}
