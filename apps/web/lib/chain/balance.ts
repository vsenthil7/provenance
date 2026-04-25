// lib/chain/balance.ts
import { provenanceChain } from './customChain';

/**
 * Fetch the INIT (uinit) balance of an account from the rollup REST endpoint.
 * Returns 0n on 404/empty.
 */
export async function fetchInitBalance(address: string): Promise<bigint> {
  if (!address) return 0n;
  const rest = provenanceChain.apis.rest;
  const url = `${rest}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=uinit`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return 0n;
  if (!res.ok) throw new Error(`balance: ${res.status}`);
  const data = (await res.json()) as { balance?: { amount?: string } };
  return BigInt(data.balance?.amount ?? '0');
}
