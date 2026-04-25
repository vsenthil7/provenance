import { describe, expect, it, vi, beforeEach } from 'vitest';

const send = vi.fn();
vi.mock('@/lib/r2', async () => {
  const actual = await vi.importActual<any>('@/lib/r2');
  return {
    ...actual,
    r2Client: () => ({ send }),
  };
});

import { POST } from './route';

beforeEach(() => send.mockReset());

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

  it('404 when object missing (S3 throws)', async () => {
    send.mockRejectedValue(new Error('NoSuchKey'));
    const res = await POST(makeReq({ contentType: 'image/png', contentHash: validHash }));
    expect(res.status).toBe(404);
  });

  it('404 when object zero-length', async () => {
    send.mockResolvedValue({ ContentLength: 0 });
    const res = await POST(makeReq({ contentType: 'image/png', contentHash: validHash }));
    expect(res.status).toBe(404);
  });
});
