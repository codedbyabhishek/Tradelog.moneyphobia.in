import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server/db';
import {
  assertAuthSchemaReady,
  assertBillingSchemaReady,
  assertPasswordResetSchemaReady,
  assertRateLimitSchemaReady,
  assertSharedCardsSchemaReady,
} from '@/lib/server/schema';

export const runtime = 'nodejs';

export async function GET() {
  const timestamp = new Date().toISOString();
  const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_NAME'];
  const missingEnv = requiredEnv.filter((name) => !process.env[name]);
  const warnings: string[] = [];

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    warnings.push('NEXT_PUBLIC_SITE_URL is not configured.');
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    warnings.push('SMTP is not fully configured; password reset and email verification delivery will fail.');
  }

  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET ||
    !process.env.RAZORPAY_WEBHOOK_SECRET
  ) {
    warnings.push('Razorpay is not fully configured; billing features may be unavailable.');
  }

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        service: 'trading-journal',
        timestamp,
        status: 'degraded',
        checks: {
          env: {
            ok: false,
            missing: missingEnv,
          },
        },
        warnings,
      },
      { status: 503 }
    );
  }

  try {
    await dbQuery('SELECT 1 AS ok');
    await Promise.all([
      assertAuthSchemaReady(),
      assertRateLimitSchemaReady(),
      assertPasswordResetSchemaReady(),
      assertBillingSchemaReady(),
      assertSharedCardsSchemaReady(),
    ]);

    return NextResponse.json(
      {
        ok: true,
        service: 'trading-journal',
        timestamp,
        status: warnings.length > 0 ? 'warning' : 'healthy',
        checks: {
          env: { ok: true },
          db: { ok: true },
          schema: { ok: true },
        },
        warnings,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown health check failure';

    return NextResponse.json(
      {
        ok: false,
        service: 'trading-journal',
        timestamp,
        status: 'degraded',
        checks: {
          env: { ok: true },
          db: { ok: false, error: message },
          schema: { ok: false, error: message },
        },
        warnings,
      },
      { status: 503 }
    );
  }
}
