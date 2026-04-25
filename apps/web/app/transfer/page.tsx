'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useKit } from '@/lib/wallet/kit';
import { provenanceChain } from '@/lib/chain/customChain';
import { toast } from 'sonner';

function TransferInner() {
  const searchParams = useSearchParams();
  const initialArtwork = searchParams.get('artwork') ?? '';
  const { initiaAddress, requestTxBlock } = useKit();
  const [artworkAddr, setArtworkAddr] = useState(initialArtwork);
  const [recipient, setRecipient] = useState('');
  const [working, setWorking] = useState(false);
  const [revertReason, setRevertReason] = useState<string | null>(null);

  const onGift = async () => {
    if (!initiaAddress) return toast.error('Connect a wallet first.');
    if (!artworkAddr || !recipient) return toast.error('Both fields are required.');
    setWorking(true);
    setRevertReason(null);
    try {
      // The legitimate path — provenance::artwork::gift emits GiftEvent.
      await requestTxBlock({
        chainId: provenanceChain.chainId,
        messages: [
          {
            typeUrl: '/initia.move.v1.MsgExecute',
            value: {
              sender: initiaAddress,
              moduleAddress: provenanceChain.packageAddress,
              moduleName: 'artwork',
              functionName: 'gift',
              typeArgs: [],
              args: [artworkAddr, recipient],
            },
          },
        ],
      });
      toast.success('Gift complete. GiftEvent emitted on-chain.');
    } catch (e) {
      toast.error(`Gift failed: ${(e as Error).message}`);
    } finally {
      setWorking(false);
    }
  };

  const onTryBypass = async () => {
    // Calls 0x1::object::transfer_call directly — Move reverts because the
    // transfer ref is not exposed at module boundary; only `gift` (free,
    // event-emitting) and `royalty::settle` (paid) can change owner.
    if (!initiaAddress) return toast.error('Connect a wallet first.');
    if (!artworkAddr || !recipient) return toast.error('Both fields are required.');
    setWorking(true);
    setRevertReason(null);
    try {
      await requestTxBlock({
        chainId: provenanceChain.chainId,
        messages: [
          {
            typeUrl: '/initia.move.v1.MsgExecute',
            value: {
              sender: initiaAddress,
              moduleAddress: '0x1',
              moduleName: 'object',
              functionName: 'transfer_call',
              typeArgs: ['0x0::artwork::Artwork'], // placeholder — exact fully-qualified type
              args: [artworkAddr, recipient],
            },
          },
        ],
      });
      // We expect this to revert. If it didn't, that's a security regression.
      toast.error(
        'Bypass succeeded — this is a security regression and should never happen. File a bug.',
      );
    } catch (e) {
      // Move will revert with E_NOT_OWNER or similar; capture the reason and show it.
      const msg = (e as Error).message;
      setRevertReason(msg);
      toast.warning('Move reverted, as expected.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 font-display text-4xl">Transfer</h1>
      <p className="mb-10 text-ink/70">
        Two paths: a free gift (allowed, observable via <code className="font-mono">GiftEvent</code>
        ), or a paid sale (must route through the marketplace and{' '}
        <code className="font-mono">royalty::settle</code>). There is no third path. The button
        below tries to construct one and demonstrates the Move revert.
      </p>

      <div className="space-y-6 rounded-sm border border-ink/15 bg-white p-8">
        <Field label="Artwork object address">
          <input
            value={artworkAddr}
            onChange={(e) => setArtworkAddr(e.target.value)}
            data-testid="xfer-artwork"
            placeholder="init1art..."
            className="w-full border border-ink/20 px-3 py-2 font-mono text-sm focus:border-ink focus:outline-none"
          />
        </Field>
        <Field label="Recipient address">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            data-testid="xfer-recipient"
            placeholder="init1..."
            className="w-full border border-ink/20 px-3 py-2 font-mono text-sm focus:border-ink focus:outline-none"
          />
        </Field>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onGift}
            disabled={working}
            data-testid="xfer-gift"
            className="w-full bg-ink py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-accent disabled:opacity-50"
          >
            {working ? 'Working…' : 'Gift (free, allowed)'}
          </button>
          <button
            type="button"
            onClick={onTryBypass}
            disabled={working}
            data-testid="xfer-bypass"
            className="w-full border border-ink/40 py-3 font-mono text-sm uppercase tracking-wider text-ink hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Attempt royalty bypass (will revert)
          </button>
        </div>

        {revertReason && (
          <div
            data-testid="xfer-revert"
            role="status"
            className="rounded-sm border border-accent bg-accent/5 p-4 text-sm"
          >
            <p className="mb-1 font-mono text-xs uppercase tracking-wider text-accent">
              Move reverted
            </p>
            <p className="font-mono text-xs">{revertReason}</p>
            <p className="mt-2 text-xs text-ink/60">
              Provenance Move resources do not allow paid transfers outside the marketplace. To
              transfer in exchange for payment, list or auction the piece — both route through{' '}
              <code className="font-mono">royalty::settle</code>.
            </p>
          </div>
        )}
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

export default function TransferPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <TransferInner />
    </Suspense>
  );
}
