// lib/wallet/kit.ts
//
// Typed wrapper around `useInterwovenKit()`. The InterwovenKit React package
// exports a hook that returns a wide, evolving surface; we only consume a
// narrow slice. Centralising the slice in one typed shim means production
// code never reaches for `as any` and tests have a stable contract to mock.
//
// If InterwovenKit's runtime shape diverges from `KitSurface`, the only
// place that breaks is here — the rest of the app keeps compiling.

import { useInterwovenKit as useInterwovenKitRaw } from '@initia/interwovenkit-react';

export interface BridgeOpenArgs {
  destChainId: string;
  destAmount?: string;
  destDenom?: string;
}

export interface RequestTxBlockArgs {
  chainId?: string;
  messages: ReadonlyArray<{
    typeUrl: string;
    value: Record<string, unknown>;
  }>;
  memo?: string;
}

export interface RequestTxBlockResult {
  txhash?: string;
}

export interface KitSurface {
  /** init1… address of the connected wallet, or undefined when disconnected */
  initiaAddress?: string;
  /** Bare username (no .init suffix), or undefined */
  username?: string;
  /** Open the connect modal */
  openConnect: () => void;
  /** Open the user-profile drawer for the connected wallet */
  openProfile: () => void;
  /** Open the cross-chain bridge UI */
  openBridge: (args: BridgeOpenArgs) => void;
  /** Request a Move tx block be signed and submitted */
  requestTxBlock: (args: RequestTxBlockArgs) => Promise<RequestTxBlockResult>;
}

/**
 * Typed view onto `useInterwovenKit`. The cast is justified once, here:
 * the runtime hook returns a richer object than we need; we expose only
 * the documented slice. Any field actually used elsewhere in the app must
 * appear in `KitSurface` first.
 */
export function useKit(): KitSurface {
  // The kit's runtime type can vary by version; the cast is intentional and
  // contained. Replacing with the full kit type when it stabilises is a
  // single-file change.
  return useInterwovenKitRaw() as unknown as KitSurface;
}
