import { NextResponse } from 'next/server';
import { getCurrentUser, ensureEmailVerificationSchema } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { createEmailVerificationToken } from '@/lib/server/email-verification';
import { sendEmailVerificationEmail } from '@/lib/server/email';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError('Unauthorized', 401);
    }

    await ensureEmailVerificationSchema();

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, message: 'Email is already verified.' });
    }

    const token = await createEmailVerificationToken(user.id);
    await sendEmailVerificationEmail({
      to: user.email,
      verificationToken: token,
    });

    return NextResponse.json({ ok: true, message: 'Verification email sent.' });
  } catch (error) {
    console.error('[auth/resend-verification] error', error);
    return jsonError('Failed to resend verification email.', 500);
  }
}
