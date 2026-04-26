import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { gql, GraphQLError } from './client';

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  // vi.stubGlobal handles the case where globalThis.fetch is non-writable
  // (Node 24 / undici behaviour). Direct assignment fails.
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('gql client', () => {
  it('returns data on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { hello: 'world' } }),
    });
    const out = await gql<{ hello: string }>('query { hello }');
    expect(out).toEqual({ hello: 'world' });
  });

  it('passes variables through', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { x: 1 } }),
    });
    await gql('query Q($id: String!) { x(id: $id) }', { id: 'abc' });
    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.variables).toEqual({ id: 'abc' });
  });

  it('throws GraphQLError on non-2xx', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(gql('query {}')).rejects.toThrow(GraphQLError);
  });

  it('throws GraphQLError when errors are present', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'bad' }] }),
    });
    await expect(gql('query {}')).rejects.toThrow(/graphql errors/);
  });

  it('throws GraphQLError when data is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(gql('query {}')).rejects.toThrow(/graphql empty/);
  });

  it('GraphQLError exposes errors field', () => {
    const e = new GraphQLError('x', { foo: 1 });
    expect(e.name).toBe('GraphQLError');
    expect(e.errors).toEqual({ foo: 1 });
  });

  // Covers the env-var truthy branch of the ENDPOINT initialiser at module
  // load (line 8 in client.ts) AND the typeof window === 'undefined' true
  // branch. The default test runs under jsdom (window is defined) so the
  // SSR path is normally unreachable; we shadow window for one re-import.
  it('uses INDEXER_GRAPHQL_URL when set on the SSR path (env-truthy branch)', async () => {
    const realWindow = (globalThis as { window?: unknown }).window;
    const prev = process.env.INDEXER_GRAPHQL_URL;
    process.env.INDEXER_GRAPHQL_URL = 'http://override.test/graphql';
    // Pretend we're on the server: typeof window === 'undefined' must be true.
    (globalThis as { window?: unknown }).window = undefined;
    try {
      vi.resetModules();
      const { gql: gql2 } = await import('./client');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ok: true } }),
      });
      await gql2('query {}');
      const url = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
      expect(url).toBe('http://override.test/graphql');
    } finally {
      if (prev === undefined) delete process.env.INDEXER_GRAPHQL_URL;
      else process.env.INDEXER_GRAPHQL_URL = prev;
      (globalThis as { window?: unknown }).window = realWindow;
      vi.resetModules();
    }
  });

  // Covers the SSR fallback branch (env unset, server-side).
  it('falls back to localhost on the SSR path when INDEXER_GRAPHQL_URL is unset', async () => {
    const realWindow = (globalThis as { window?: unknown }).window;
    const prev = process.env.INDEXER_GRAPHQL_URL;
    delete process.env.INDEXER_GRAPHQL_URL;
    (globalThis as { window?: unknown }).window = undefined;
    try {
      vi.resetModules();
      const { gql: gql2 } = await import('./client');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ok: true } }),
      });
      await gql2('query {}');
      const url = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0];
      expect(url).toBe('http://localhost:42069/graphql');
    } finally {
      if (prev !== undefined) process.env.INDEXER_GRAPHQL_URL = prev;
      (globalThis as { window?: unknown }).window = realWindow;
      vi.resetModules();
    }
  });
});
