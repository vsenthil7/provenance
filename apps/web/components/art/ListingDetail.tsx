// components/art/ListingDetail.tsx
import type { Listing } from '@/lib/api/types';
import { formatINIT } from '@/lib/format';

export function ListingDetail({ listing }: { listing: Listing }) {
  const { artwork, price_uinit, status } = listing;
  return (
    <article>
      <div className="aspect-square overflow-hidden rounded-lg bg-ink/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artwork.image_uri} alt={artwork.title} className="h-full w-full object-cover" />
      </div>
      <div className="mt-6">
        <p className="font-mono text-xs uppercase tracking-widest text-ink/50">
          Edition {artwork.edition_no}
        </p>
        <h1 className="mt-1 font-display text-3xl text-ink">{artwork.title}</h1>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Price</dt>
            <dd className="text-ink">{formatINIT(BigInt(price_uinit))} INIT</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Royalty</dt>
            <dd className="text-ink">{(artwork.royalty_bps / 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Status</dt>
            <dd className="text-ink capitalize">{status}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Owner</dt>
            <dd className="font-mono text-xs text-ink">{artwork.current_owner}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
