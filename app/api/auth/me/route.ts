import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/auth';
import { loadBootstrapData } from '@/lib/server/bootstrap';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const bootstrap = await loadBootstrapData(user.id, user.email);
    return NextResponse.json({ user, bootstrap });
  } catch (error) {
    console.error('[auth/me] error', error);
    return NextResponse.json({ error: 'Failed to get session.' }, { status: 500 });
  }
}
