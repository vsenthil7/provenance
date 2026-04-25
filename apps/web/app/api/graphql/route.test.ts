import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from './route';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

const makeReq = (body: string): any => ({
  text: async () => body,
});

describe('POST /api/graphql', () => {
  it('forwards body and returns indexer response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const res = await POST(makeReq('{"query":"{ok}"}'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ok).toBe(1);
  });

  it('400 when body cannot be read', async () => {
    const req: any = { text: async () => { throw new Error(); } };
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('502 when indexer unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('econnrefused'));
    const res = await POST(makeReq('{"query":"{ok}"}'));
    expect(res.status).toBe(502);
  });

  it('forwards upstream error status', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ errors: ['x'] }), { status: 500 }),
    );
    const res = await POST(makeReq('{"query":"{x}"}'));
    expect(res.status).toBe(500);
  });
});
