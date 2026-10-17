const MAX_TEMPLATE_IMAGE_BYTES = 1024 * 1024;

export function getTemplateImageValidationError(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > 1_398_127) {
    return 'Playbook images must be 1 MB or smaller.';
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return 'Choose a valid JPEG, PNG, or WebP playbook image.';

  const encoded = match[2];
  const bytes = Buffer.from(encoded, 'base64');
  if (
    bytes.length === 0 ||
    bytes.length > MAX_TEMPLATE_IMAGE_BYTES ||
    bytes.toString('base64') !== encoded
  ) {
    return 'Playbook images must be 1 MB or smaller.';
  }

  const isJpeg = match[1] === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = match[1] === 'image/png' &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = match[1] === 'image/webp' &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP';

  return isJpeg || isPng || isWebp ? null : 'The selected file does not match its image format.';
}
