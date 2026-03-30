import { NextRequest } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';

interface RateLimitOptions {
  prefix: string;
  identifier: string;
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  remaining: number;
}

interface RateLimitRow {
  key_name: string;
  requests: number;
  window_started_at: string;
  blocked_until: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __tradingDiaryRateLimitTableReady: boolean | undefined;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase() || 'unknown';
}

function toIsoWithoutMs(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function ensureRateLimitTable() {
  if (global.__tradingDiaryRateLimitTableReady) return;

  await dbExecute(
    `CREATE TABLE IF NOT EXISTS auth_rate_limits (
      key_name VARCHAR(191) NOT NULL,
      requests INT UNSIGNED NOT NULL DEFAULT 0,
      window_started_at DATETIME NOT NULL,
      blocked_until DATETIME NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (key_name),
      KEY idx_auth_rate_limits_updated_at (updated_at),
      KEY idx_auth_rate_limits_blocked_until (blocked_until)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  global.__tradingDiaryRateLimitTableReady = true;
}

async function pruneOldLimits() {
  if (Math.random() > 0.02) return;

  await dbExecute(
    `DELETE FROM auth_rate_limits
     WHERE updated_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND (blocked_until IS NULL OR blocked_until < NOW())`
  );
}

export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }

  return 'unknown';
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { prefix, identifier, windowMs, maxRequests, blockDurationMs = windowMs } = options;

  await ensureRateLimitTable();
  await pruneOldLimits();

  const now = new Date();
  const key = `${prefix}:${normalizeIdentifier(identifier)}`;

  const rows = await dbQuery<RateLimitRow[]>(
    `SELECT key_name, requests, window_started_at, blocked_until
     FROM auth_rate_limits
     WHERE key_name = ?
     LIMIT 1`,
    [key]
  );

  if (rows.length === 0) {
    await dbExecute(
      `INSERT INTO auth_rate_limits (key_name, requests, window_started_at, blocked_until, updated_at)
       VALUES (?, 1, NOW(), NULL, NOW())`,
      [key]
    );
    return { allowed: true, remaining: Math.max(maxRequests - 1, 0) };
  }

  const row = rows[0];
  const blockedUntil = toDate(row.blocked_until);
  if (blockedUntil && blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000), 1),
      remaining: 0,
    };
  }

  const windowStartedAt = toDate(row.window_started_at) || now;
  const elapsedMs = now.getTime() - windowStartedAt.getTime();

  if (elapsedMs > windowMs) {
    await dbExecute(
      `UPDATE auth_rate_limits
       SET requests = 1,
           window_started_at = NOW(),
           blocked_until = NULL,
           updated_at = NOW()
       WHERE key_name = ?`,
      [key]
    );
    return { allowed: true, remaining: Math.max(maxRequests - 1, 0) };
  }

  if (row.requests >= maxRequests) {
    const blockUntil = new Date(now.getTime() + blockDurationMs);
    await dbExecute(
      `UPDATE auth_rate_limits
       SET blocked_until = ?, updated_at = NOW()
       WHERE key_name = ?`,
      [toIsoWithoutMs(blockUntil), key]
    );
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil(blockDurationMs / 1000), 1),
      remaining: 0,
    };
  }

  const nextRequests = row.requests + 1;
  await dbExecute(
    `UPDATE auth_rate_limits
     SET requests = ?, updated_at = NOW()
     WHERE key_name = ?`,
    [nextRequests, key]
  );

  return { allowed: true, remaining: Math.max(maxRequests - nextRequests, 0) };
}

