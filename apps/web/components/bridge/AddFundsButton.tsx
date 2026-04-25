'use client';

import { useKit } from '@/lib/wallet/kit';
import { provenanceChain } from '@/lib/chain/customChain';

export function AddFundsButton() {
  const { openBridge } = useKit();
  return (
    <button
      type="button"
      onClick={() => openBridge({ destChainId: provenanceChain.chainId })}
      className="hidden border border-ink/20 px-3 py-2 font-mono text-xs uppercase tracking-wider hover:border-ink md:inline-block"
      data-testid="add-funds"
    >
      Add funds
    </button>
  );
}

export interface BridgeToBuyButtonProps {
  destAmountUinit: bigint;
}

export function BridgeToBuyButton({ destAmountUinit }: BridgeToBuyButtonProps) {
  const { openBridge } = useKit();
  return (
    <button
      type="button"
      onClick={() =>
        openBridge({
          destChainId: provenanceChain.chainId,
          destAmount: destAmountUinit.toString(),
          destDenom: 'uinit',
        })
      }
      data-testid="bridge-to-buy"
      className="w-full border border-accent bg-accent py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-ink hover:border-ink"
    >
      Bridge to buy
    </button>
  );
}
