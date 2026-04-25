'use client';

import { useState } from 'react';
import { useKit } from '@/lib/wallet/kit';
import { useSettings } from '@/lib/settings/store';
import { AUTOSIGN_DEFAULTS, buildPlaceBidAuthz } from '@/lib/authz';
import { provenanceChain } from '@/lib/chain/customChain';
import { formatINIT } from '@/lib/format';
import { toast } from 'sonner';

const DURATION_OPTIONS = [
  { label: '1 hour', secs: 60 * 60 },
  { label: '4 hours', secs: 4 * 60 * 60 },
  { label: '24 hours (max)', secs: 24 * 60 * 60 },
];

export default function SessionsPage() {
  const { initiaAddress, requestTxBlock } = useKit();
  const session = useSettings();
  const [duration, setDuration] = useState(AUTOSIGN_DEFAULTS.defaultDurationSecs);
  const [working, setWorking] = useState(false);

  const onEnable = async () => {
    if (!initiaAddress) {
      toast.error('Connect a wallet first.');
      return;
    }
    setWorking(true);
    const payload = buildPlaceBidAuthz(duration);
    try {
      // requestTxBlock: actual MsgGrant for the place_bid scope.
      // We hand-build the message because we want the scope verified inline.
      await requestTxBlock({
        chainId: provenanceChain.chainId,
        messages: [
          {
            typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
            value: {
              granter: initiaAddress,
              // grantee is the kit's session signer; the kit fills it in.
              authorization: {
                msgTypeUrl: payload.msgTypeUrl,
                target: payload.target,
              },
              spendCapUinit: payload.spendCapUinit.toString(),
              expiry: payload.expiryUnix,
            },
          },
        ],
      });
      session.enable(payload.durationSecs, payload.target, payload.expiryUnix);
      toast.success('Auto-sign enabled for bidding.');
    } catch (e) {
      toast.error(`Failed to enable: ${(e as Error).message}`);
    } finally {
      setWorking(false);
    }
  };

  const onDisable = async () => {
    setWorking(true);
    try {
      // Optimistic local disable; an authoritative on-chain Revoke is also
      // sent. If the chain call fails, the wallet still won't auto-sign
      // because session.isEnabled is false.
      session.disable();
      await requestTxBlock({
        chainId: provenanceChain.chainId,
        messages: [
          {
            typeUrl: '/cosmos.authz.v1beta1.MsgRevoke',
            value: {
              granter: initiaAddress,
              msgTypeUrl: '/initia.move.v1.MsgExecute',
            },
          },
        ],
      });
      toast.success('Auto-sign disabled.');
    } catch (e) {
      toast.error(`Local session cleared, but on-chain revoke failed: ${(e as Error).message}`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 font-display text-4xl">Sessions</h1>
      <p className="mb-10 text-ink/70">
        Sign once, bid many times. The session is scoped — it can only place bids on auctions, and
        only spend up to the cap. It cannot list, cancel, mint, accept offers, or move funds
        elsewhere. You can revoke it at any time.
      </p>

      <section className="rounded-sm border border-ink/15 bg-white p-8" data-testid="autosign-card">
        <p className="font-mono text-xs uppercase tracking-wider text-ink/60">Scope</p>
        <p className="mb-1 font-mono text-base">
          {provenanceChain.packageAddress}::auction::place_bid
        </p>
        <p className="mb-6 text-sm text-ink/60">
          Spend cap: {formatINIT(AUTOSIGN_DEFAULTS.spendCapUinit)} per session
        </p>

        <p className="mb-4 font-mono text-xs uppercase tracking-wider text-ink/60">Status</p>
        <p className="mb-6 font-display text-2xl" data-testid="autosign-status">
          {session.isEnabled && !session.isExpired() ? (
            <span className="text-accent">Enabled</span>
          ) : (
            <span className="text-ink/50">Disabled</span>
          )}
        </p>

        {!session.isEnabled || session.isExpired() ? (
          <>
            <p className="mb-2 font-mono text-xs uppercase tracking-wider text-ink/60">Duration</p>
            <div className="mb-6 flex gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.secs}
                  type="button"
                  onClick={() => setDuration(opt.secs)}
                  data-testid={`duration-${opt.secs}`}
                  className={`border px-4 py-2 font-mono text-xs uppercase tracking-wider ${
                    duration === opt.secs
                      ? 'border-ink bg-ink text-paper'
                      : 'border-ink/20 hover:border-ink'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onEnable}
              disabled={working}
              data-testid="enable-autosign"
              className="w-full bg-ink py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-accent disabled:opacity-50"
            >
              {working ? 'Enabling…' : 'Enable 1-tap bidding'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onDisable}
            disabled={working}
            data-testid="disable-autosign"
            className="w-full border border-ink py-3 font-mono text-sm uppercase tracking-wider hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {working ? 'Disabling…' : 'Disable'}
          </button>
        )}
      </section>
    </div>
  );
}
