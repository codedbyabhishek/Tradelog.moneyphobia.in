import { describe, expect, it } from 'vitest';
import { getTemplateImageValidationError } from '@/lib/server/template-image-validation';

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe('playbook image validation', () => {
  it('allows templates without an image and accepts a correctly encoded PNG', () => {
    expect(getTemplateImageValidationError(undefined)).toBeNull();
    expect(getTemplateImageValidationError(null)).toBeNull();
    expect(getTemplateImageValidationError(`data:image/png;base64,${pngSignature.toString('base64')}`)).toBeNull();
  });

  it('accepts correctly encoded JPEG and WebP images', () => {
    const jpegSignature = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const webpSignature = Buffer.from('RIFF0000WEBP');
    expect(getTemplateImageValidationError(`data:image/jpeg;base64,${jpegSignature.toString('base64')}`)).toBeNull();
    expect(getTemplateImageValidationError(`data:image/webp;base64,${webpSignature.toString('base64')}`)).toBeNull();
  });

  it('rejects unsupported, malformed, and mismatched image data', () => {
    expect(getTemplateImageValidationError('https://example.com/image.png')).toContain('valid JPEG, PNG, or WebP');
    expect(getTemplateImageValidationError('data:image/png;base64,not-base64!')).toContain('valid JPEG, PNG, or WebP');
    expect(getTemplateImageValidationError(`data:image/jpeg;base64,${pngSignature.toString('base64')}`)).toContain('does not match');
  });

  it('rejects images larger than 1 MB', () => {
    const oversized = Buffer.alloc(1024 * 1024 + 1, 1);
    expect(getTemplateImageValidationError(`data:image/png;base64,${oversized.toString('base64')}`)).toContain('1 MB or smaller');
  });
});
