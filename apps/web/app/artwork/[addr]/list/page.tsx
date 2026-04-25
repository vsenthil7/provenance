'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useKit } from '@/lib/wallet/kit';
import { provenanceChain } from '@/lib/chain/customChain';
import { initToUinit, formatINIT } from '@/lib/format';
import { toast } from 'sonner';

// THE HEADLINE 5C JOURNEY.
//
// When a holder lists an artwork for resale, the buyer's eventual purchase
// will route through provenance::royalty::settle — by Move construction, the
// original artist receives their royalty even though the artist no longer
// owns the piece. This page is what makes that demo real.

export default function ListForResalePage({
  params,
}: {
  params: Promise<{ addr: string }>;
}) {
  const { addr } = use(params);
  const { initiaAddress, requestTxBlock } = useKit();
  const [priceInit, setPriceInit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!initiaAddress) return toast.error('Connect a wallet first.');
    let priceUinit: bigint;
    try {
      priceUinit = initToUinit(priceInit);
    } catch {
      return toast.error('Invalid price.');
    }
    if (priceUinit <= 0n) return toast.error('Price must be positive.');

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
              moduleName: 'market',
              functionName: 'list_fixed',
              typeArgs: [],
              args: [addr, priceUinit.toString(), '0'],
            },
          },
        ],
      });
      toast.success(
        `Listed for ${formatINIT(priceUinit)}. Royalty will be paid to the artist on every sale, automatically.`,
      );
      window.location.href = `/artwork/${addr}`;
    } catch (e) {
      toast.error(`List failed: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-wider text-ink/60">
        The headline royalty journey
      </p>
      <h1 className="mb-2 mt-1 font-display text-4xl">List for resale</h1>
      <p className="mb-10 text-ink/70">
        When this artwork sells, payment is split automatically:
        <span className="ml-1 font-mono text-sm">
          royalty → original artist · 0.5% protocol fee · remainder → you.
        </span>{' '}
        There is no path that bypasses{' '}
        <code className="font-mono text-sm">royalty::settle</code>. Move&apos;s resource
        model + friend visibility makes that path unconstructable.
      </p>

      <div className="space-y-6 rounded-sm border border-ink/15 bg-white p-8">
        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/60">
            Artwork
          </label>
          <p className="font-mono text-sm">{addr}</p>
        </div>

        <div>
          <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/60">
            Price (INIT)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={priceInit}
            onChange={(e) => setPriceInit(e.target.value)}
            data-testid="resale-price"
            placeholder="0.0"
            className="w-full border border-ink/20 px-3 py-2 font-mono text-base focus:border-ink focus:outline-none"
          />
        </div>

        <div className="rounded-sm border border-accent/30 bg-accent/5 p-4 text-xs text-ink/70">
          <p className="font-mono uppercase tracking-wider text-accent">
            What the buyer&apos;s payment becomes
          </p>
          <p className="mt-2">
            Out of every {formatINIT(initToUinit(priceInit || '1'))} the buyer pays:
          </p>
          <ul className="mt-1 list-inside list-disc font-mono text-xs">
            <li>
              {formatINIT(
                (initToUinit(priceInit || '1') * 500n) / 10000n,
              )} → original artist (5% royalty, depending on artwork)
            </li>
            <li>
              {formatINIT(
                (initToUinit(priceInit || '1') * 50n) / 10000n,
              )} → protocol treasury (0.5% fee)
            </li>
            <li>
              {formatINIT(
                (initToUinit(priceInit || '1') * 9450n) / 10000n,
              )} → you (seller net at 5% royalty)
            </li>
          </ul>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !priceInit}
          data-testid="resale-submit"
          className="w-full bg-ink py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Listing…' : 'List for resale'}
        </button>

        <p className="text-center text-xs text-ink/50">
          <Link href={`/artwork/${addr}`} className="underline">
            Back to artwork
          </Link>
        </p>
      </div>
    </div>
  );
}
