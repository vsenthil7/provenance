import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gql, GraphQLError } from './client';

beforeEach(() => {
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});

describe('gql client', () => {
  it('returns data on success', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { hello: 'world' } }),
    });
    const out = await gql<{ hello: string }>('query { hello }');
    expect(out).toEqual({ hello: 'world' });
  });

  it('passes variables through', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { x: 1 } }),
    });
    await gql('query Q($id: String!) { x(id: $id) }', { id: 'abc' });
    const call = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.variables).toEqual({ id: 'abc' });
  });

  it('throws GraphQLError on non-2xx', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(gql('query {}')).rejects.toThrow(GraphQLError);
  });

  it('throws GraphQLError when errors are present', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'bad' }] }),
    });
    await expect(gql('query {}')).rejects.toThrow(/graphql errors/);
  });

  it('throws GraphQLError when data is missing', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
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
});
