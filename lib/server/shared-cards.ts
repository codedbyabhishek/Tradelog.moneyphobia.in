import { randomBytes } from 'crypto';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { assertSharedCardsSchemaReady } from '@/lib/server/schema';

interface SharedCardRow {
  share_id: string;
  user_id: number;
  share_type: string;
  title: string;
  caption: string | null;
  summary_text: string | null;
  image_data_url: string;
  payload_json: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface SharedCardRecord {
  shareId: string;
  userId: number;
  shareType: 'performance' | 'trade';
  title: string;
  caption: string | null;
  summaryText: string | null;
  imageDataUrl: string;
  payload: Record<string, unknown> | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type SharedCardLookup =
  | { status: 'active'; record: SharedCardRecord }
  | { status: 'expired'; record: SharedCardRecord }
  | { status: 'missing' };

const SHARED_CARD_TTL_HOURS = 24;
const SHARED_CARD_RETENTION_DAYS = 7;

export async function ensureSharedCardsSchema() {
  await assertSharedCardsSchemaReady();
}

export function generateShareId() {
  return randomBytes(9).toString('base64url');
}

export async function createSharedCard(input: {
  userId: number;
  shareType: 'performance' | 'trade';
  title: string;
  caption?: string | null;
  summaryText?: string | null;
  imageDataUrl: string;
  payload?: Record<string, unknown> | null;
}) {
  await ensureSharedCardsSchema();
  await cleanupExpiredSharedCards();

  const shareId = generateShareId();

  await dbExecute(
    `INSERT INTO shared_cards (
      share_id,
      user_id,
      share_type,
      title,
      caption,
      summary_text,
      image_data_url,
      payload_json,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR), NOW(), NOW())`,
    [
      shareId,
      input.userId,
      input.shareType,
      input.title,
      input.caption || null,
      input.summaryText || null,
      input.imageDataUrl,
      input.payload ? JSON.stringify(input.payload) : null,
      SHARED_CARD_TTL_HOURS,
    ],
  );

  return shareId;
}

function mapSharedCardRow(row: SharedCardRow): SharedCardRecord {
  let payload: Record<string, unknown> | null = null;
  if (row.payload_json) {
    try {
      payload = JSON.parse(row.payload_json) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  }

  return {
    shareId: row.share_id,
    userId: row.user_id,
    shareType: row.share_type === 'trade' ? 'trade' : 'performance',
    title: row.title,
    caption: row.caption,
    summaryText: row.summary_text,
    imageDataUrl: row.image_data_url,
    payload,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSharedCardById(shareId: string): Promise<SharedCardRecord | null> {
  const result = await getSharedCardLookup(shareId);
  return result.status === 'active' ? result.record : null;
}

export async function getSharedCardLookup(shareId: string): Promise<SharedCardLookup> {
  await ensureSharedCardsSchema();
  await cleanupExpiredSharedCards();

  const rows = await dbQuery<SharedCardRow[]>(
    `SELECT share_id, user_id, share_type, title, caption, summary_text, image_data_url, payload_json, expires_at, created_at, updated_at
     FROM shared_cards
     WHERE share_id = ?
     LIMIT 1`,
    [shareId],
  );

  const row = rows[0];
  if (!row) return { status: 'missing' };

  const record = mapSharedCardRow(row);
  const isExpired = new Date(record.expiresAt).getTime() <= Date.now();

  if (isExpired) {
    return { status: 'expired', record };
  }

  return { status: 'active', record };
}

export async function cleanupExpiredSharedCards() {
  await ensureSharedCardsSchema();
  await dbExecute(
    `DELETE FROM shared_cards
     WHERE expires_at <= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? DAY)`,
    [SHARED_CARD_RETENTION_DAYS],
  );
}
