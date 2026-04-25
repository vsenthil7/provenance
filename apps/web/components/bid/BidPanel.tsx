'use client';

import { useState } from 'react';
import { useKit } from '@/lib/wallet/kit';
import { useSettings } from '@/lib/settings/store';
import { initToUinit, formatINIT } from '@/lib/format';
import { provenanceChain } from '@/lib/chain/customChain';
import { toast } from 'sonner';

export interface BidPanelProps {
  auctionObjectAddr: string;
  currentBidUinit: bigint;
  reserveUinit: bigint;
  minIncrementBps: number;
}

export function BidPanel({
  auctionObjectAddr,
  currentBidUinit,
  reserveUinit,
  minIncrementBps,
}: BidPanelProps) {
  const { initiaAddress, requestTxBlock } = useKit();
  const isAutosign = useSettings((s) => s.isEnabled && !s.isExpired());
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minRequiredUinit =
    currentBidUinit === 0n
      ? reserveUinit
      : currentBidUinit + (currentBidUinit * BigInt(minIncrementBps)) / 10000n;

  const onSubmit = async () => {
    if (!initiaAddress) {
      toast.error('Connect a wallet first.');
      return;
    }
    let uinit: bigint;
    try {
      uinit = initToUinit(amount);
    } catch {
      toast.error('Invalid bid amount.');
      return;
    }
    if (uinit < minRequiredUinit) {
      toast.error(`Bid must be at least ${formatINIT(minRequiredUinit)}.`);
      return;
    }

    setSubmitting(true);
    try {
      await requestTxBlock({
        chainId: provenanceChain.chainId,
        messages: [
          {
            typeUrl: '/initia.move.v1.MsgExecute',
            value: {
              sender: initiaAddress,
              moduleAddress: provenanceChain.packageAddress,
              moduleName: 'auction',
              functionName: 'place_bid',
              typeArgs: [],
              args: [auctionObjectAddr, uinit.toString()],
            },
          },
        ],
      });
      toast.success(`Bid placed: ${formatINIT(uinit)}`);
      setAmount('');
    } catch (e: unknown) {
      toast.error(`Bid failed: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-sm border border-ink/10 bg-white p-6">
      <p className="font-mono text-xs uppercase tracking-wider text-ink/60">
        Current bid
      </p>
      <p className="mb-6 font-display text-3xl">
        {currentBidUinit === 0n ? 'No bids yet' : formatINIT(currentBidUinit)}
      </p>
      <p className="mb-2 font-mono text-xs text-ink/60">
        Minimum next bid: {formatINIT(minRequiredUinit)}
      </p>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.0"
        aria-label="Bid amount"
        className="mb-4 w-full border border-ink/20 px-3 py-2 font-mono text-base focus:border-ink focus:outline-none"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !amount}
        data-testid={isAutosign ? 'bid-tap' : 'bid-sign'}
        className="w-full bg-ink py-3 font-mono text-sm uppercase tracking-wider text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? 'Submitting…'
          : isAutosign
            ? `Bid ${amount || '…'} INIT (1-tap)`
            : `Bid ${amount || '…'} INIT (sign)`}
      </button>
      {!isAutosign && (
        <p className="mt-3 text-center text-xs text-ink/60">
          <a href="/settings/sessions" className="underline">
            Enable 1-tap bidding
          </a>{' '}
          to skip the wallet popup.
        </p>
      )}
    </div>
  );
}
