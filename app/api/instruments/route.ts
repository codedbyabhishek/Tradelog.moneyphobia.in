import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { searchDhanInstruments } from '@/lib/server/dhan-instruments';

export const runtime = 'nodejs';

/**
 * Searches the public Dhan instrument master. This endpoint is authenticated
 * because it is used only from the private trade-journal interface.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const query = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 64);
    if (query.length < 2) return NextResponse.json({ instruments: [] });

    const instruments = await searchDhanInstruments(query);
    return NextResponse.json(
      { instruments },
      { headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' } },
    );
  } catch (error) {
    console.error('[instruments/get] error', error);
    return jsonError('Unable to load the live instrument catalogue.', 502);
  }
}
