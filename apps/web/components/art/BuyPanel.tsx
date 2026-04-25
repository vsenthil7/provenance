// components/art/BuyPanel.tsx
'use client';

import { useState } from 'react';
import { useKit } from '@/lib/wallet/kit';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Listing } from '@/lib/api/types';
import { formatINIT } from '@/lib/format';
import { fetchInitBalance } from '@/lib/chain/balance';
import { buildBuyNowMessage } from '@/lib/chain/messages';
import { BridgeToBuyButton } from '@/components/bridge/AddFundsButton';

const GAS_BUFFER_UINIT = 200_000n; // 0.2 INIT — generous

export function BuyPanel({ listing }: { listing: Listing }) {
  const { initiaAddress, requestTxBlock, openConnect } = useKit();
  const [submitting, setSubmitting] = useState(false);

  const priceUinit = BigInt(listing.price_uinit);
  const requiredUinit = priceUinit + GAS_BUFFER_UINIT;

  const { data: balanceUinit, refetch } = useQuery({
    queryKey: ['balance', initiaAddress],
    enabled: !!initiaAddress,
    queryFn: () => fetchInitBalance(initiaAddress as string),
    refetchInterval: 5_000,
  });

  const sufficient = balanceUinit !== undefined && balanceUinit >= requiredUinit;

  async function handleBuy() {
    if (!initiaAddress) return;
    setSubmitting(true);
    try {
      const msg = buildBuyNowMessage({
        sender: initiaAddress,
        listingObjectAddr: listing.object_addr,
        priceUinit,
      });
      await requestTxBlock({ messages: [msg], memo: 'provenance buy' });
      toast.success('Purchase submitted. Royalty will be paid on settlement.');
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Purchase failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!initiaAddress) {
    return (
      <aside className="rounded-xl border border-ink/10 bg-paper p-6">
        <h2 className="font-display text-xl text-ink">Buy this piece</h2>
        <p className="mt-2 text-ink/70">Connect your wallet to continue.</p>
        <button
          type="button"
          onClick={openConnect}
          className="mt-4 rounded-md bg-ink px-4 py-2 text-paper hover:bg-ink/90"
        >
          Connect wallet
        </button>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border border-ink/10 bg-paper p-6">
      <h2 className="font-display text-xl text-ink">Buy this piece</h2>
      <p className="mt-2 text-ink/70">
        Price <span className="font-medium text-ink">{formatINIT(priceUinit)} INIT</span>. Royalty
        is paid to the artist on settlement — guaranteed by the Move module, not the marketplace.
      </p>

      {sufficient ? (
        <button
          type="button"
          disabled={submitting}
          onClick={handleBuy}
          className="mt-6 w-full rounded-md bg-accent px-4 py-3 font-medium text-paper hover:bg-accent/90 disabled:opacity-40"
        >
          {submitting ? 'Submitting…' : `Buy for ${formatINIT(priceUinit)} INIT`}
        </button>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-ink/60">
            You need {formatINIT(requiredUinit)} INIT to complete this purchase. Bridge from
            another chain to fund your wallet.
          </p>
          <BridgeToBuyButton destAmountUinit={requiredUinit} />
        </div>
      )}
    </aside>
  );
}
