import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const requestToken = request.nextUrl.searchParams.get('request_token');
  const status = request.nextUrl.searchParams.get('status');

  return NextResponse.json({
    ok: true,
    status: status || 'unknown',
    requestTokenReceived: Boolean(requestToken),
    message:
      'Zerodha callback groundwork is ready. The request_token exchange flow still needs to be completed before full live sync is available.',
  });
}
