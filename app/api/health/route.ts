import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/server/db';
import { getEnvValidationReport } from '@/lib/env';
import {
  assertAuthSchemaReady,
  assertBillingSchemaReady,
  assertPasswordResetSchemaReady,
  assertRateLimitSchemaReady,
  assertSharedCardsSchemaReady,
} from '@/lib/server/schema';

export const runtime = 'nodejs';

function getAuthorizedHealthResponse(request: Request) {
  const token = process.env.HEALTHCHECK_TOKEN || '';
  const authHeader = request.headers.get('authorization') || '';
  const headerToken = request.headers.get('x-healthcheck-token') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return process.env.NODE_ENV !== 'production';
  }

  return headerToken === token || bearerToken === token;
}

export async function GET(request: Request) {
  if (!getAuthorizedHealthResponse(request)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const timestamp = new Date().toISOString();
  const envReport = getEnvValidationReport();

  if (!envReport.ok) {
    return NextResponse.json(
      {
        ok: false,
        service: 'trading-journal',
        timestamp,
        status: 'degraded',
        checks: {
          env: {
            ok: false,
            required: envReport.required,
            optional: envReport.optional,
          },
        },
        warnings: envReport.warnings,
        errors: envReport.errors,
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
        status: envReport.warnings.length > 0 ? 'warning' : 'healthy',
        checks: {
          env: {
            ok: true,
            required: envReport.required,
            optional: envReport.optional,
          },
          db: { ok: true },
          schema: { ok: true },
        },
        warnings: envReport.warnings,
        siteUrl: envReport.siteUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: 'trading-journal',
        timestamp,
        status: 'degraded',
        checks: {
          env: {
            ok: true,
            required: envReport.required,
            optional: envReport.optional,
          },
          db: { ok: false },
          schema: { ok: false },
        },
        warnings: envReport.warnings,
        errors: ['Database or schema validation failed.'],
      },
      { status: 503 }
    );
  }
}
