import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/auth';
import { loadBootstrapData } from '@/lib/server/bootstrap';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const cachedBootstrapUser = Number(request.headers.get('x-bootstrap-cache-user'));
    if (Number.isFinite(cachedBootstrapUser) && cachedBootstrapUser === user.id) {
      return NextResponse.json({ user });
    }

    const bootstrap = await loadBootstrapData(user.id, user.email);
    return NextResponse.json({ user, bootstrap });
  } catch (error) {
    console.error('[auth/me] error', error);
    return NextResponse.json({ error: 'Failed to get session.' }, { status: 500 });
  }
}
