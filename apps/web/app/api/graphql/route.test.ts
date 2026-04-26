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

  it('400 when req.text() throws (catch branch)', async () => {
    const badReq: any = {
      text: async () => {
        throw new Error('stream torn');
      },
    };
    const res = await POST(badReq);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid body');
  });

  // Cover the upstream-headers `??` fallback at line 25: when the indexer
  // does not return a Content-Type header, the proxy must default to
  // application/json. The trick is forcing upstream.headers.get('content-type')
  // to return null, which `new Response('...')` won't do (it auto-sets
  // text/plain). We construct a fake Response with a headers.get that
  // returns null on every key.
  it('defaults to application/json when upstream omits content-type', async () => {
    const fakeUpstream: any = {
      status: 200,
      headers: { get: (_: string) => null },
      text: async () => '{"data":{"ok":1}}',
    };
    fetchMock.mockResolvedValue(fakeUpstream);
    const res = await POST(makeReq('{"query":"{ok}"}'));
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
