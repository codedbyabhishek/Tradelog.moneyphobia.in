import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestToken = request.nextUrl.searchParams.get('request_token');
  const status = request.nextUrl.searchParams.get('status');

  return NextResponse.json({
    ok: false,
    status: status || 'unknown',
    requestTokenReceived: Boolean(requestToken),
    message: 'Zerodha sync is coming soon and is not available in production yet.',
  }, { status: 501 });
}
