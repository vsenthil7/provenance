import { describe, expect, it, vi } from 'vitest';
import { assertSha256Hex, objectKey, publicUrl, validateUpload } from './index';

describe('validateUpload', () => {
  it('accepts png', () => {
    expect(validateUpload({ contentType: 'image/png', size: 1024 })).toEqual({ ok: true });
  });
  it('accepts jpeg, webp, avif', () => {
    for (const t of ['image/jpeg', 'image/webp', 'image/avif']) {
      expect(validateUpload({ contentType: t, size: 1024 }).ok).toBe(true);
    }
  });
  it('rejects unsupported types', () => {
    expect(validateUpload({ contentType: 'image/gif', size: 1024 })).toEqual({
      ok: false,
      reason: 'unsupported content-type: image/gif',
    });
  });
  it('rejects zero size', () => {
    expect(validateUpload({ contentType: 'image/png', size: 0 }).ok).toBe(false);
  });
  it('rejects negative size', () => {
    expect(validateUpload({ contentType: 'image/png', size: -1 }).ok).toBe(false);
  });
  it('rejects NaN size', () => {
    expect(validateUpload({ contentType: 'image/png', size: NaN }).ok).toBe(false);
  });
  it('rejects oversize', () => {
    expect(
      validateUpload({ contentType: 'image/png', size: 26 * 1024 * 1024 }).ok,
    ).toBe(false);
  });
});

describe('objectKey', () => {
  it('produces art/<hash>.<ext>', () => {
    expect(objectKey('AAAA', 'image/png')).toBe('art/aaaa.png');
  });
  it('lowercases hex', () => {
    expect(objectKey('FFEE', 'image/jpeg')).toBe('art/ffee.jpeg');
  });
  it('handles unknown content type by defaulting extension', () => {
    expect(objectKey('aa', 'application')).toBe('art/aa.bin');
  });
});

describe('publicUrl', () => {
  it('joins base + key', () => {
    expect(publicUrl('art/abc.png')).toMatch(/\/art\/abc\.png$/);
  });
});

describe('assertSha256Hex', () => {
  it('accepts 64-char hex', () => {
    const h = 'a'.repeat(64);
    expect(assertSha256Hex(h)).toBe(h);
  });
  it('strips 0x prefix', () => {
    expect(assertSha256Hex('0x' + 'b'.repeat(64))).toBe('b'.repeat(64));
  });
  it('lowercases', () => {
    expect(assertSha256Hex('A'.repeat(64))).toBe('a'.repeat(64));
  });
  it('rejects wrong length', () => {
    expect(() => assertSha256Hex('abc')).toThrow(/not a sha256/);
  });
  it('rejects non-hex chars', () => {
    expect(() => assertSha256Hex('z'.repeat(64))).toThrow(/not a sha256/);
  });
});

// presignPut covered by api/presign route tests
describe('r2 module exports', () => {
  it('module compiles and exports the SDK functions', async () => {
    const m = await import('./index');
    expect(typeof m.presignPut).toBe('function');
    expect(typeof m.r2Client).toBe('function');
    expect(m.R2_BUCKET).toBeDefined();
    expect(m.R2_PUBLIC_BASE).toBeDefined();
  });
});
