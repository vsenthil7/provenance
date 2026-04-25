import { describe, expect, it, vi } from 'vitest';
import { POST } from './route';

vi.mock('@/lib/r2', async () => {
  const actual = await vi.importActual<any>('@/lib/r2');
  return {
    ...actual,
    presignPut: vi.fn(async (key: string) => `https://r2.test/${key}?sig=abc`),
  };
});

function makeReq(body: unknown): any {
  return {
    json: async () => body,
  };
}

const validHash = 'a'.repeat(64);

describe('POST /api/presign', () => {
  it('returns 200 with upload URL on valid request', async () => {
    const res = await POST(
      makeReq({ contentType: 'image/png', size: 1024, contentHash: validHash }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.uploadUrl).toMatch(/^https:\/\/r2\.test\//);
    expect(json.key).toMatch(/^art\/a+\.png$/);
    expect(json.contentHash).toBe(validHash);
  });

  it('400 on invalid JSON', async () => {
    const req: any = { json: async () => { throw new Error('bad json'); } };
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400 on missing fields', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('missing fields');
  });

  it('400 on unsupported content type', async () => {
    const res = await POST(
      makeReq({ contentType: 'image/gif', size: 1024, contentHash: validHash }),
    );
    expect(res.status).toBe(400);
  });

  it('400 on bad hash', async () => {
    const res = await POST(
      makeReq({ contentType: 'image/png', size: 1024, contentHash: 'short' }),
    );
    expect(res.status).toBe(400);
  });

  it('502 when presign throws', async () => {
    const r2 = await import('@/lib/r2');
    (r2.presignPut as any).mockRejectedValueOnce(new Error('s3 down'));
    const res = await POST(
      makeReq({ contentType: 'image/png', size: 1024, contentHash: validHash }),
    );
    expect(res.status).toBe(502);
  });
});
