import { provenanceChain } from '@/lib/chain/customChain';

/**
 * Authz scope for the auto-sign drawer.
 *
 * - GenericAuthorization is restricted to `/initia.move.v1.MsgExecute` and
 *   only `place_bid` on the provenance::auction module.
 * - SendAuthorization caps total INIT spend at 20 INIT (20_000_000 uinit) over
 *   the session lifetime.
 *
 * Anything broader is a security regression — the user has explicitly scoped
 * the session to bidding.
 */
export const AUTOSIGN_DEFAULTS = {
  scopeModule: 'auction',
  scopeFunction: 'place_bid',
  spendCapUinit: 20_000_000n,
  defaultDurationSecs: 60 * 60, // 1 hour
  maxDurationSecs: 24 * 60 * 60, // 24 hours
} as const;

export interface AuthzPayload {
  msgTypeUrl: string;
  // The fully-qualified Move target the session may execute.
  target: string;
  // Send cap in uinit.
  spendCapUinit: bigint;
  durationSecs: number;
  expiryUnix: number;
}

export function buildPlaceBidAuthz(durationSecs: number, now: number = nowSec()): AuthzPayload {
  const dur = clampDuration(durationSecs);
  return {
    msgTypeUrl: '/initia.move.v1.MsgExecute',
    target: `${provenanceChain.packageAddress}::${AUTOSIGN_DEFAULTS.scopeModule}::${AUTOSIGN_DEFAULTS.scopeFunction}`,
    spendCapUinit: AUTOSIGN_DEFAULTS.spendCapUinit,
    durationSecs: dur,
    expiryUnix: now + dur,
  };
}

export function clampDuration(secs: number): number {
  if (!Number.isFinite(secs) || secs <= 0) return AUTOSIGN_DEFAULTS.defaultDurationSecs;
  if (secs > AUTOSIGN_DEFAULTS.maxDurationSecs) return AUTOSIGN_DEFAULTS.maxDurationSecs;
  return Math.floor(secs);
}

export function isPlaceBidScope(target: string): boolean {
  return target.endsWith('::auction::place_bid');
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}
