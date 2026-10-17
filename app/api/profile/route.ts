import { NextRequest, NextResponse } from 'next/server';
import { dbExecute, dbQuery } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { jsonError, parseJsonBody } from '@/lib/server/http';

export const runtime = 'nodejs';

const PROFILE_PHOTO_SETTING_KEY = 'profile_photo';
const MAX_PROFILE_PHOTO_BYTES = 1024 * 1024;

interface ProfilePhotoRow {
  value_json: string;
}

function validateProfilePhoto(value: unknown): string | null {
  if (typeof value !== 'string') {
    throw new Error('Choose a JPEG, PNG, or WebP profile photo.');
  }
  if (value.length > 1_398_127) {
    throw new Error('Profile photos must be 1 MB or smaller.');
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) {
    throw new Error('Choose a valid JPEG, PNG, or WebP profile photo.');
  }

  const encoded = match[2];
  const bytes = Buffer.from(encoded, 'base64');
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PROFILE_PHOTO_BYTES ||
    bytes.toString('base64') !== encoded
  ) {
    throw new Error('Profile photos must be 1 MB or smaller.');
  }

  const isJpeg = match[1] === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = match[1] === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = match[1] === 'image/webp' &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    throw new Error('The selected file does not match its image format.');
  }

  return value;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const rows = await dbQuery<ProfilePhotoRow[]>(
      'SELECT value_json FROM user_settings WHERE user_id = ? AND key_name = ? LIMIT 1',
      [user.id, PROFILE_PHOTO_SETTING_KEY],
    );
    const profilePhoto = rows[0] ? JSON.parse(rows[0].value_json) as string : null;

    return NextResponse.json({
      profile: {
        name: user.name || '',
        email: user.email,
        photoDataUrl: profilePhoto,
      },
    });
  } catch (error) {
    console.error('[profile/get] error', error);
    return jsonError('Failed to load profile settings.', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError('Unauthorized', 401);

    const body = await parseJsonBody(request);
    if (!body || typeof body.name !== 'string' || !Object.hasOwn(body, 'photoDataUrl')) {
      return jsonError('Provide your name and profile photo.', 400);
    }

    const name = body.name.trim();
    if (name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
      return jsonError('Name must be 80 characters or fewer and cannot contain control characters.', 400);
    }

    let photoDataUrl: string | null;
    try {
      photoDataUrl = body.photoDataUrl === null ? null : validateProfilePhoto(body.photoDataUrl);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : 'Invalid profile photo.', 400);
    }

    await dbExecute(
      'UPDATE users SET name = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
      [name || null, user.id],
    );

    if (photoDataUrl === null) {
      await dbExecute(
        'DELETE FROM user_settings WHERE user_id = ? AND key_name = ?',
        [user.id, PROFILE_PHOTO_SETTING_KEY],
      );
    } else {
      await dbExecute(
        `INSERT INTO user_settings (user_id, key_name, value_json, updated_at)
         VALUES (?, ?, ?, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = UTC_TIMESTAMP()`,
        [user.id, PROFILE_PHOTO_SETTING_KEY, JSON.stringify(photoDataUrl)],
      );
    }

    return NextResponse.json({
      profile: {
        name,
        email: user.email,
        photoDataUrl,
      },
    });
  } catch (error) {
    console.error('[profile/put] error', error);
    return jsonError('Failed to save profile settings.', 500);
  }
}
