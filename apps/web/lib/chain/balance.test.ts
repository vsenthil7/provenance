import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw';
import { fetchInitBalance } from './balance';

describe('fetchInitBalance', () => {
  it('returns 0 for empty address', async () => {
    expect(await fetchInitBalance('')).toBe(0n);
  });

  it('returns the amount on 200', async () => {
    server.use(
      http.get('*/cosmos/bank/v1beta1/balances/:addr/by_denom', () =>
        HttpResponse.json({ balance: { denom: 'uinit', amount: '12345678' } }),
      ),
    );
    expect(await fetchInitBalance('init1foo')).toBe(12_345_678n);
  });

  it('returns 0 on 404', async () => {
    server.use(
      http.get('*/cosmos/bank/v1beta1/balances/:addr/by_denom', () =>
        HttpResponse.json({ message: 'not found' }, { status: 404 }),
      ),
    );
    expect(await fetchInitBalance('init1foo')).toBe(0n);
  });

  it('returns 0 if amount field missing', async () => {
    server.use(
      http.get('*/cosmos/bank/v1beta1/balances/:addr/by_denom', () => HttpResponse.json({})),
    );
    expect(await fetchInitBalance('init1foo')).toBe(0n);
  });

  it('throws on 500', async () => {
    server.use(
      http.get('*/cosmos/bank/v1beta1/balances/:addr/by_denom', () =>
        HttpResponse.text('boom', { status: 500 }),
      ),
    );
    await expect(fetchInitBalance('init1foo')).rejects.toThrow(/500/);
  });
});
