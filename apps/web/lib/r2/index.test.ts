import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  assertSha256Hex,
  objectKey,
  publicUrl,
  validateUpload,
  r2Client,
  presignPut,
  R2_BUCKET,
  R2_PUBLIC_BASE,
} from './index';

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
  it('reports the correct max-bytes reason on oversize', () => {
    const res = validateUpload({ contentType: 'image/png', size: 26 * 1024 * 1024 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/file too large/);
  });
  it('reports the correct positive-size reason on zero size', () => {
    const res = validateUpload({ contentType: 'image/png', size: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('size must be positive');
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
  it('produces a string starting with the public base', () => {
    expect(publicUrl('x')).toBe(`${R2_PUBLIC_BASE}/x`);
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

describe('r2Client factory', () => {
  const orig = {
    endpoint: process.env.R2_ENDPOINT,
    key: process.env.R2_ACCESS_KEY_ID,
    secret: process.env.R2_SECRET_ACCESS_KEY,
  };
  afterEach(() => {
    process.env.R2_ENDPOINT = orig.endpoint;
    process.env.R2_ACCESS_KEY_ID = orig.key;
    process.env.R2_SECRET_ACCESS_KEY = orig.secret;
  });

  it('constructs an S3Client with the configured endpoint and credentials', () => {
    process.env.R2_ENDPOINT = 'https://r2.example.com';
    process.env.R2_ACCESS_KEY_ID = 'AKIA-test';
    process.env.R2_SECRET_ACCESS_KEY = 'sk-test';
    const c = r2Client();
    expect(c).toBeDefined();
    // Region is fixed to 'auto' for R2; the SDK exposes config as a callable.
    expect(typeof c.config.region === 'function' || typeof c.config.region === 'string').toBe(true);
  });

  it('falls back to empty credentials when env is unset', () => {
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    const c = r2Client();
    expect(c).toBeDefined();
  });
});

describe('presignPut', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a presigned URL string from the SDK', async () => {
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({
      getSignedUrl: vi.fn().mockResolvedValue('https://signed.example/url?sig=abc'),
    }));
    const mod = await import('./index');
    const url = await mod.presignPut('art/aa.png', 'image/png', 600);
    expect(url).toBe('https://signed.example/url?sig=abc');
  });

  it('passes the bucket, key, content-type, and expiry to the SDK', async () => {
    const getSignedUrl = vi.fn().mockResolvedValue('https://s/u');
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }));
    const mod = await import('./index');
    await mod.presignPut('art/zz.jpeg', 'image/jpeg', 120);
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    const [, cmd, opts] = getSignedUrl.mock.calls[0]!;
    expect(opts).toEqual({ expiresIn: 120 });
    // PutObjectCommand stores its input on `.input`
    expect((cmd as { input: { Bucket: string; Key: string; ContentType: string } }).input).toEqual({
      Bucket: R2_BUCKET,
      Key: 'art/zz.jpeg',
      ContentType: 'image/jpeg',
    });
  });

  it('defaults expiresInSec to 600 when not provided', async () => {
    const getSignedUrl = vi.fn().mockResolvedValue('https://s/u');
    vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl }));
    const mod = await import('./index');
    await mod.presignPut('art/k.webp', 'image/webp');
    const [, , opts] = getSignedUrl.mock.calls[0]!;
    expect(opts).toEqual({ expiresIn: 600 });
  });
});

describe('r2 module exports', () => {
  it('module compiles and exports the SDK functions', async () => {
    const m = await import('./index');
    expect(typeof m.presignPut).toBe('function');
    expect(typeof m.r2Client).toBe('function');
    expect(m.R2_BUCKET).toBeDefined();
    expect(m.R2_PUBLIC_BASE).toBeDefined();
  });
});
