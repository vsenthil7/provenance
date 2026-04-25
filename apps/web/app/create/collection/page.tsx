'use client';

import { useState } from 'react';
import { useKit } from '@/lib/wallet/kit';
import { provenanceChain } from '@/lib/chain/customChain';
import { toast } from 'sonner';

export default function CreateCollectionPage() {
  const { initiaAddress, requestTxBlock } = useKit();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [royaltyBps, setRoyaltyBps] = useState(500);
  const [supplyCap, setSupplyCap] = useState<number | ''>('');
  const [metadataUri, setMetadataUri] = useState('');
  const [mutable, setMutable] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!initiaAddress) {
      toast.error('Connect a wallet first.');
      return;
    }
    if (royaltyBps > 1000) {
      toast.error('Royalty cannot exceed 10% (1000 bps).');
      return;
    }
    if (symbol.length > 8) {
      toast.error('Symbol must be 8 characters or less.');
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
              moduleName: 'collection',
              functionName: 'create_collection',
              typeArgs: [],
              args: [
                name,
                symbol,
                royaltyBps.toString(),
                supplyCap !== '',
                supplyCap === '' ? '0' : supplyCap.toString(),
                metadataUri,
                mutable,
              ],
            },
          },
        ],
      });
      toast.success(`Collection "${name}" created.`);
      // Indexer will pick up the event; redirect to the artist's collections.
      window.location.href = '/portfolio?tab=collections';
    } catch (e) {
      toast.error(`Create failed: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 font-display text-4xl">New collection</h1>
      <p className="mb-10 text-ink/70">
        A collection is a group of artworks under a shared royalty default and supply cap. Symbol
        is a short tag, max 8 characters. Royalty is in basis points (500 = 5%, max 1000 = 10%).
      </p>

      <div className="space-y-6 rounded-sm border border-ink/15 bg-white p-8">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="col-name"
            className="w-full border border-ink/20 px-3 py-2 font-mono text-base focus:border-ink focus:outline-none"
            placeholder="Lina's Quiet Series"
          />
        </Field>
        <Field label="Symbol (≤ 8 chars)">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            maxLength={8}
            data-testid="col-symbol"
            className="w-full border border-ink/20 px-3 py-2 font-mono text-base uppercase focus:border-ink focus:outline-none"
            placeholder="QUIET"
          />
        </Field>
        <Field label="Royalty (bps, max 1000 = 10%)">
          <input
            type="number"
            min={0}
            max={1000}
            value={royaltyBps}
            onChange={(e) => setRoyaltyBps(Number(e.target.value))}
            data-testid="col-royalty"
            className="w-full border border-ink/20 px-3 py-2 font-mono text-base focus:border-ink focus:outline-none"
          />
        </Field>
        <Field label="Supply cap (blank for open edition)">
          <input
            type="number"
            min={1}
            value={supplyCap}
            onChange={(e) => setSupplyCap(e.target.value === '' ? '' : Number(e.target.value))}
            data-testid="col-supply"
            className="w-full border border-ink/20 px-3 py-2 font-mono text-base focus:border-ink focus:outline-none"
          />
        </Field>
        <Field label="Metadata URI">
          <input
            value={metadataUri}
            onChange={(e) => setMetadataUri(e.target.value)}
            data-testid="col-uri"
            className="w-full border border-ink/20 px-3 py-2 font-mono text-base focus:border-ink focus:outline-none"
            placeholder="ipfs://… or https://…"
          />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={mutable}
            onChange={(e) => setMutable(e.target.checked)}
            data-testid="col-mutable"
            className="mt-1"
          />
          <span>
            Allow metadata to be updated later.{' '}
            <span className="text-ink/60">
              Default off — most collectors prefer immutable metadata.
            </span>
          </span>
        </label>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !name || !symbol || !metadataUri}
          data-testid="col-submit"
          className="mt-4 w-full bg-ink py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create collection'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink/60">
        {label}
      </label>
      {children}
    </div>
  );
}
