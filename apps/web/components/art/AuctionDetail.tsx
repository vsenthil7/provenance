// components/art/AuctionDetail.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Auction } from '@/lib/api/types';
import { formatINIT } from '@/lib/format';

export function AuctionDetail({ auction }: { auction: Auction }) {
  const endsAtMs = new Date(auction.ends_at).getTime();
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, endsAtMs - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingMs(Math.max(0, endsAtMs - Date.now()));
    }, 1_000);
    return () => clearInterval(id);
  }, [endsAtMs]);

  const { artwork, current_bid_uinit, reserve_uinit, status } = auction;

  return (
    <article>
      <div className="aspect-square overflow-hidden rounded-lg bg-ink/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artwork.image_uri} alt={artwork.title} className="h-full w-full object-cover" />
      </div>
      <div className="mt-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink/50">
          Auction · Edition {artwork.edition_no}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink">{artwork.title}</h1>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Current bid</dt>
            <dd className="font-display text-2xl text-ink">
              {current_bid_uinit === '0'
                ? `Reserve ${formatINIT(BigInt(reserve_uinit))}`
                : `${formatINIT(BigInt(current_bid_uinit))} INIT`}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Ends in</dt>
            <dd className="font-mono text-lg text-ink" data-testid="auction-countdown">
              {formatRemaining(remainingMs)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Royalty</dt>
            <dd className="text-ink">{(artwork.royalty_bps / 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Status</dt>
            <dd className="text-ink capitalize">{status}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'ended';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}
