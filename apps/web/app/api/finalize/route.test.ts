import { describe, expect, it, vi, beforeEach } from 'vitest';

const send = vi.fn();
vi.mock('@/lib/r2', async () => {
  const actual = await vi.importActual<any>('@/lib/r2');
  return {
    ...actual,
    r2Client: () => ({ send }),
  };
});

// HeadObjectCommand is constructed inside the route; if we make its
// constructor throw, the route's try/catch handles it as the
// "object not found" 404 path. This avoids the unhandled-rejection
// gymnastics required to mock send() to reject on Node 24.
vi.mock('@aws-sdk/client-s3', async () => {
  const actual = await vi.importActual<any>('@aws-sdk/client-s3');
  return {
    ...actual,
    // Default: real HeadObjectCommand. Tests override per-case via vi.mocked().
    HeadObjectCommand: vi.fn((input: unknown) => ({ input })),
  };
});

import { POST } from './route';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

beforeEach(() => {
  send.mockReset();
  vi.mocked(HeadObjectCommand).mockImplementation(((input: unknown) => ({ input })) as never);
});

const validHash = 'a'.repeat(64);
const makeReq = (body: unknown): any => ({ json: async () => body });

describe('POST /api/finalize', () => {
  it('200 on valid object present', async () => {
    send.mockResolvedValue({ ContentLength: 1234 });
    const res = await POST(makeReq({ contentType: 'image/png', contentHash: validHash }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.contentHash).toBe(validHash);
  });

  it('400 invalid JSON', async () => {
    const res = await POST({ json: async () => { throw new Error(); } } as any);
    expect(res.status).toBe(400);
  });

  it('400 missing fields', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('400 bad hash', async () => {
    const res = await POST(makeReq({ contentType: 'image/png', contentHash: 'short' }));
    expect(res.status).toBe(400);
  });

  it('404 when S3 head call throws (covers catch branch)', async () => {
    vi.mocked(HeadObjectCommand).mockImplementation((() => {
      throw new Error('NoSuchKey');
    }) as never);
    const res = await POST(makeReq({ contentType: 'image/png', contentHash: validHash }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('object not found');
    expect(json.detail).toBe('NoSuchKey');
  });

  it('404 when object zero-length', async () => {
    send.mockResolvedValue({ ContentLength: 0 });
    const res = await POST(makeReq({ contentType: 'image/png', contentHash: validHash }));
    expect(res.status).toBe(404);
  });
});
