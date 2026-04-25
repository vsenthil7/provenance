import { useQuery } from '@tanstack/react-query';
import { provenanceChain } from '@/lib/chain/customChain';
import { shortenAddress } from '@/lib/format';

const STALE = 24 * 60 * 60 * 1000;
const GC = 7 * 24 * 60 * 60 * 1000;

const REST = () => provenanceChain.apis.rest;

/**
 * Forward resolution: address → `name.init` (or null on miss).
 * Throws nothing — 404 returns null and is cached.
 */
export async function resolveUsername(address: string): Promise<string | null> {
  if (!address) return null;
  const url = `${REST()}/initia/usernames/v1/usernames/from_address/${address}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`username resolver: ${res.status}`);
  const data = (await res.json()) as { username?: string };
  return data.username ? `${data.username}.init` : null;
}

/**
 * Reverse: `name` (without .init) → address.
 */
export async function resolveAddress(username: string): Promise<string | null> {
  if (!username) return null;
  const bare = username.replace(/\.init$/, '');
  const url = `${REST()}/initia/usernames/v1/addresses/from_username/${bare}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`address resolver: ${res.status}`);
  const data = (await res.json()) as { address?: string };
  return data.address ?? null;
}

/** React hook variant using TanStack Query for caching. */
export function useUsername(address: string | undefined) {
  return useQuery({
    queryKey: ['username', address],
    enabled: !!address,
    queryFn: () => resolveUsername(address as string),
    staleTime: STALE,
    gcTime: GC,
  });
}

/** Display helper — username if resolved, otherwise short address. */
export function displayName(
  address: string | undefined,
  username: string | null | undefined,
): string {
  if (!address) return '';
  if (username) return username;
  return shortenAddress(address);
}
