import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, deleteSessionByToken } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('td_session')?.value;
    if (token) {
      await deleteSessionByToken(token);
    }
    await clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth/logout] error', error);
    return NextResponse.json({ error: 'Failed to logout.' }, { status: 500 });
  }
}
