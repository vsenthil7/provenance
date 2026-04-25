import { create } from 'zustand';
import { provenanceChain } from '@/lib/chain/customChain';

export interface HealthState {
  chainHealthy: boolean;
  lastBlockHeight: number;
  lastCheckedAt: number;
  unhealthySinceMs: number | null; // when unhealthy first detected
  setHealth: (h: { healthy: boolean; height: number; at: number }) => void;
}

const UNHEALTHY_BANNER_MS = 60_000;

export const useHealth = create<HealthState>((set, get) => ({
  chainHealthy: true,
  lastBlockHeight: 0,
  lastCheckedAt: 0,
  unhealthySinceMs: null,
  setHealth: ({ healthy, height, at }) => {
    const prev = get();
    if (healthy) {
      set({ chainHealthy: true, lastBlockHeight: height, lastCheckedAt: at, unhealthySinceMs: null });
    } else {
      set({
        chainHealthy: false,
        lastBlockHeight: height,
        lastCheckedAt: at,
        unhealthySinceMs: prev.unhealthySinceMs ?? at,
      });
    }
  },
}));

export function shouldShowSequencerBanner(s: HealthState, now: number): boolean {
  if (s.chainHealthy) return false;
  if (s.unhealthySinceMs === null) return false;
  return now - s.unhealthySinceMs >= UNHEALTHY_BANNER_MS;
}

export async function pollChainHealth(rpcUrl: string = provenanceChain.apis.rpc): Promise<{
  healthy: boolean;
  height: number;
}> {
  try {
    const res = await fetch(`${rpcUrl}/status`, { cache: 'no-store' });
    if (!res.ok) return { healthy: false, height: 0 };
    const data = (await res.json()) as {
      result?: { sync_info?: { latest_block_height?: string; catching_up?: boolean } };
    };
    const heightStr = data?.result?.sync_info?.latest_block_height ?? '0';
    const catchingUp = data?.result?.sync_info?.catching_up ?? false;
    const height = Number(heightStr);
    return { healthy: !catchingUp && height > 0, height };
  } catch {
    return { healthy: false, height: 0 };
  }
}
