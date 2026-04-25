import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw';
import { displayName, resolveAddress, resolveUsername } from './index';

const LINA = 'init1lina000000000000000000000000000000lina';
const UNKNOWN = 'init1xxx000000000000000000000000000000xxx';

describe('resolveUsername (forward)', () => {
  it('returns username with .init suffix on hit', async () => {
    expect(await resolveUsername(LINA)).toBe('lina.init');
  });
  it('returns null on 404 (the fallback path — must be covered)', async () => {
    expect(await resolveUsername(UNKNOWN)).toBeNull();
  });
  it('returns null on empty input', async () => {
    expect(await resolveUsername('')).toBeNull();
  });
  it('throws on 5xx errors', async () => {
    server.use(
      http.get('*/initia/usernames/v1/usernames/from_address/:addr', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    await expect(resolveUsername(LINA)).rejects.toThrow(/username resolver/);
  });
  it('returns null when response has no username field', async () => {
    server.use(
      http.get('*/initia/usernames/v1/usernames/from_address/:addr', () =>
        HttpResponse.json({}),
      ),
    );
    expect(await resolveUsername(LINA)).toBeNull();
  });
});

describe('resolveAddress (reverse)', () => {
  it('resolves bare username', async () => {
    expect(await resolveAddress('lina')).toBe(LINA);
  });
  it('strips .init suffix', async () => {
    expect(await resolveAddress('lina.init')).toBe(LINA);
  });
  it('returns null on 404', async () => {
    expect(await resolveAddress('nobody')).toBeNull();
  });
  it('returns null on empty input', async () => {
    expect(await resolveAddress('')).toBeNull();
  });
  it('throws on 5xx errors', async () => {
    server.use(
      http.get('*/initia/usernames/v1/addresses/from_username/:name', () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    await expect(resolveAddress('lina')).rejects.toThrow(/address resolver/);
  });
  it('returns null when response has no address field', async () => {
    server.use(
      http.get('*/initia/usernames/v1/addresses/from_username/:name', () =>
        HttpResponse.json({}),
      ),
    );
    expect(await resolveAddress('lina')).toBeNull();
  });
});

describe('displayName', () => {
  it('returns empty for no address', () => {
    expect(displayName(undefined, undefined)).toBe('');
  });
  it('returns username when available', () => {
    expect(displayName(LINA, 'lina.init')).toBe('lina.init');
  });
  it('falls back to shortened address', () => {
    expect(displayName(LINA, null)).toBe('init1lin…lina');
  });
  it('falls back when username is undefined', () => {
    expect(displayName(LINA, undefined)).toBe('init1lin…lina');
  });
});

describe('useUsername hook', () => {
  it('returns the resolved username via TanStack Query', async () => {
    const React = await import('react');
    const { renderHook, waitFor } = await import('@testing-library/react');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { useUsername } = await import('./index');
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);
    const { result } = renderHook(() => useUsername(LINA), { wrapper });
    await waitFor(() => expect(result.current.data).toBe('lina.init'));
  });

  it('does not fire when address is undefined', async () => {
    const React = await import('react');
    const { renderHook } = await import('@testing-library/react');
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
    const { useUsername } = await import('./index');
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);
    const { result } = renderHook(() => useUsername(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
